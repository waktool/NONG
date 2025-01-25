document.addEventListener('DOMContentLoaded', () => {
  const proxyBaseUrl = 'https://nong-uc04.onrender.com/';
  const clanApiUrl = `${proxyBaseUrl}api/clan/nong`;
  const usersApiUrl = `${proxyBaseUrl}v1/users`;
  const battlesJsonUrl = 'assets/data/battles.json';

  const loadingElement = document.getElementById('loading');
  const cardContainer = document.getElementById('cardContainer');

  let battlesJsonData = {}; // Holds battles.json data

  // Initialize the application
  function initialize() {
    fetchBattlesJsonData()
      .then(() => fetchClanApiData())
      .catch(error => showError(`Initialization failed: ${error.message}`));
  }

  // Fetch battles.json
  function fetchBattlesJsonData() {
    return fetch(battlesJsonUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Error fetching battles.json: ${response.status}`);
        return response.json();
      })
      .then(data => {
        battlesJsonData = mapBattlesJsonData(data);
      })
      .catch(error => {
        showError(`Failed to fetch battles.json: ${error.message}`);
        throw error;
      });
  }

  // Map battles.json data
  function mapBattlesJsonData(data) {
    const map = {};
    data.forEach(battle => {
      map[battle.BattleID] = {
        name: battle.Name,
        startDate: new Date(battle.StartDate),
        endDate: new Date(battle.EndDate),
      };
    });
    return map;
  }

  // Fetch clan API data
  function fetchClanApiData() {
    return fetch(clanApiUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Clan API error: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.status !== 'ok') throw new Error('Invalid Clan API response');
        displayClanTitle(data.data);
        processClanApiMembers(data.data);
      })
      .catch(error => {
        showError(`Failed to fetch clan API data: ${error.message}`);
        throw error;
      });
  }

  // Display clan title
  function displayClanTitle(clanData) {
    const titleElement = document.getElementById('clanTitle');
    const iconUrl = `https://ps99.biggamesapi.io/image/${clanData.Icon.replace('rbxassetid://', '')}`;
    titleElement.innerHTML = `
      <div class="clan-header">
        <img src="${iconUrl}" alt="${clanData.Name} Icon" class="clan-icon">
        <div>
          <h1>${clanData.Name}</h1>
          <p>${clanData.Desc}</p>
          <p><strong>Created:</strong> ${new Date(clanData.Created * 1000).toLocaleString()}</p>
          <p><strong>Capacity:</strong> ${clanData.MemberCapacity} Members, ${clanData.OfficerCapacity} Officers</p>
          <p><strong>Guild Level:</strong> ${clanData.GuildLevel}</p>
        </div>
      </div>
    `;
  }

  // Adjust join times based on battles
  function adjustJoinTimeBasedOnBattles(members, battlesApiData, battlesJsonData) {
    members.forEach(member => {
      // Find the earliest battle the user participated in (API data)
      const userBattles = Object.keys(battlesApiData || {}).filter(battleId => {
        return battlesApiData[battleId].AwardUserIDs.includes(Number(member.UserID)) ||
              battlesApiData[battleId].PointContributions.some(c => c.UserID === member.UserID);
      });

      if (userBattles.length > 0) {
        // Sort battles by their start date (from JSON)
        userBattles.sort((a, b) => {
          const startDateA = battlesJsonData[a]?.startDate || new Date();
          const startDateB = battlesJsonData[b]?.startDate || new Date();
          return startDateA - startDateB;
        });

        const earliestBattleId = userBattles[0];
        const earliestBattleJson = battlesJsonData[earliestBattleId];

        if (earliestBattleJson) {
          const joinDate = new Date(member.JoinTime * 1000); // Convert to Date object
          const endDate = earliestBattleJson.endDate;
          const startDate = earliestBattleJson.startDate;

          // Compare join date with battle end date
          if (joinDate > endDate) {
            member.JoinTime = Math.floor(startDate.getTime() / 1000); // Replace join time with battle start date
          }
        }
      }
    });
  }

  // Adjust the processClanApiMembers function to include this logic
  async function processClanApiMembers(clanData) {
    const members = extractClanApiMembers(clanData);
    const userIds = members.map(member => member.UserID);

    try {
      const [userDetails, avatarData] = await Promise.all([
        fetchUserDetailsApi(userIds),
        fetchAvatarThumbnailsApi(userIds),
      ]);

      updateMembersWithApiData(members, userDetails, avatarData, clanData.DiamondContributions?.AllTime?.Data || []);

      // Adjust join times using battles API and JSON data
      adjustJoinTimeBasedOnBattles(members, clanData.Battles, battlesJsonData);

      sortMembersByRank(members);
      displayMembers(members, clanData.Battles);
    } catch (error) {
      showError(`Failed to process members: ${error.message}`);
    }
  }

  // Extract members from clan API data
  function extractClanApiMembers(clanData) {
    return [
      ...clanData.Members,
      { UserID: clanData.Owner, PermissionLevel: 'Owner', JoinTime: clanData.Created },
    ];
  }

  // Fetch user details from API
  async function fetchUserDetailsApi(userIds) {
    const payload = { userIds: userIds.map(Number), excludeBannedUsers: true };
    const response = await fetch(usersApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Error fetching user details: ${response.status}`);
    return response.json().then(data => data.data);
  }

  // Fetch avatar thumbnails from API
  async function fetchAvatarThumbnailsApi(userIds) {
    const avatarApiUrl = `${proxyBaseUrl}v1/avatars?userIds=${userIds.join(',')}&size=150x150&format=Png&isCircular=false`;
    const response = await fetch(avatarApiUrl);
    if (!response.ok) throw new Error(`Error fetching avatar thumbnails: ${response.status}`);
    return response.json().then(data => data.data);
  }

  // Update members with API data
  function updateMembersWithApiData(members, userDetails, avatarData, diamondContributions) {
    members.forEach(member => {
      const user = userDetails.find(u => u.id === Number(member.UserID));
      const avatar = avatarData.find(a => a.targetId === Number(member.UserID));
      const diamondEntry = diamondContributions.find(d => d.UserID === member.UserID);

      if (user) {
        member.name = user.name;
        member.displayName = user.displayName;
      }
      if (avatar) {
        member.avatarUrl = avatar.imageUrl;
      }
      member.diamondContributions = diamondEntry ? diamondEntry.Diamonds : 0;
    });
  }

  // Adjust join time based on battles.json
  function adjustJoinTimeBasedOnBattlesJson(members) {
    members.forEach(member => {
      const joinDate = new Date(member.JoinTime * 1000);
      Object.values(battlesJsonData).forEach(battle => {
        if (battle.endDate < joinDate) {
          member.JoinTime = Math.floor(battle.startDate.getTime() / 1000);
        }
      });
    });
  }

  // Sort members by rank and name
  function sortMembersByRank(members) {
    members.sort((a, b) => {
      const rankA = a.PermissionLevel === 'Owner' ? 1 : a.PermissionLevel === 90 ? 2 : 3;
      const rankB = b.PermissionLevel === 'Owner' ? 1 : b.PermissionLevel === 90 ? 2 : 3;

      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // Display members
  function displayMembers(members, battlesApiData) {
    processBattlesApiData(battlesApiData, members);
    members.forEach(member => addMemberCard(member));
    loadingElement.classList.add('hidden');
  }

  // Process battles from API and update members
  function processBattlesApiData(battlesApiData, members) {
    Object.values(battlesApiData).forEach(battle => {
      const battleId = battle.BattleID;
      const awardedUserIds = battle.AwardUserIDs || [];
      const pointsMap = battle.PointContributions.reduce((map, contribution) => {
        map[contribution.UserID] = contribution.Points;
        return map;
      }, {});

      members.forEach(member => {
        if (!member.battles) member.battles = {};
        if (awardedUserIds.includes(Number(member.UserID)) || pointsMap[member.UserID]) {
          member.battles[battleId] = {
            medal: battle.EarnedMedal || 'None',
            points: pointsMap[member.UserID] || 0,
          };
        }
      });
    });
  }

  // Add member card
  function addMemberCard(member) {
    const card = createMemberCard(member);
    cardContainer.appendChild(card);
  }

  // Create member card
  function createMemberCard(member) {
    const robloxProfileUrl = `https://www.roblox.com/users/${member.UserID}/profile`;
    const avatarUrl = member.avatarUrl || 'https://via.placeholder.com/150';
    const permissionLevel = member.PermissionLevel === 'Owner' ? 'Owner' : member.PermissionLevel === 90 ? 'Officer' : 'Member';
    const elapsedTime = formatElapsedTime(member.JoinTime);
    const hoverText = `Joined: ${formatJoinDate(member.JoinTime)}`;

    return buildCardHtml({
      avatarUrl,
      robloxProfileUrl,
      memberName: member.name || 'Unknown User',
      displayName: member.displayName || 'Unknown',
      permissionLevel,
      elapsedTime,
      hoverText,
      battlesHtml: buildBattlesHtml(member.battles),
      diamondContributions: formatDiamonds(member.diamondContributions),
    });
  }

  // Build member card HTML
  function buildCardHtml({ avatarUrl, robloxProfileUrl, memberName, displayName, permissionLevel, elapsedTime, hoverText, battlesHtml, diamondContributions }) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.innerHTML = `
      <img src="${avatarUrl}" alt="Avatar" class="avatar">
      <div class="card-content">
        <h3>
          <a href="${robloxProfileUrl}" target="_blank" rel="noopener noreferrer">${memberName}</a>
        </h3>
        <p class="username">(@${displayName})</p>
        <p class="permission-level ${permissionLevel.toLowerCase()}">
          <span>${permissionLevel}</span>
        </p>
        <p class="join-time" title="${hoverText}">
          <img src="assets/images/Nong.png" alt="Join Icon" class="icon">
          ${elapsedTime}
        </p>
        <div class="battle-icons">
          ${battlesHtml}
        </div>
        <p class="diamond-contribution">
          <img src="assets/images/Diamonds.webp" alt="Diamonds Icon" class="icon">
          ${diamondContributions} Diamonds
        </p>
      </div>
    `;
    return card;
  }

  // Build battles HTML
  function buildBattlesHtml(battles) {
    if (!battles) return '<span>No battles participated</span>';
    return `
      <div class="medals-container">
        ${Object.entries(battles)
          .map(([battleId, data]) => {
            const battle = battlesJsonData[battleId] || { name: battleId };
            const medalIcon = getMedalIcon(data.medal);
            const formattedPoints = data.points.toLocaleString();
            const hoverBattle = `${battle.name}<br>${formattedPoints}`;
            return `
              <div class="tooltip-container">
                <img src="${medalIcon}" alt="${data.medal} Medal" class="medal-icon">
                <div class="tooltip">${hoverBattle}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  // Utility functions
  function formatElapsedTime(startTimestamp) {
    const { years, months, days } = calculateElapsedTime(startTimestamp);
    const parts = [];
    if (years) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  function calculateElapsedTime(startTimestamp) {
    const startDate = new Date(startTimestamp * 1000);
    const now = new Date();
    let years = now.getFullYear() - startDate.getFullYear();
    let months = now.getMonth() - startDate.getMonth();
    let days = now.getDate() - startDate.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years, months, days };
  }

  function formatJoinDate(startTimestamp) {
    const joinDate = new Date(startTimestamp * 1000);
    return joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatDiamonds(diamonds) {
    return diamonds ? diamonds.toLocaleString() : '0';
  }

  function getMedalIcon(medal) {
    switch (medal.toLowerCase()) {
      case 'gold': return 'assets/images/gold.webp';
      case 'silver': return 'assets/images/silver.webp';
      case 'bronze': return 'assets/images/bronze.webp';
      case 'good': return 'assets/images/good.png';
      default: return 'assets/images/none.png';
    }
  }

  function showError(message) {
    console.error(message);
    loadingElement.textContent = message;
  }

  // Start the application
  initialize();
});
