document.addEventListener('DOMContentLoaded', () => {
    const clanApiUrl = 'https://biggamesapi.io/api/clan/nong'; // Original Clan API
    const proxyBaseUrl = 'https://nong-uc04.onrender.com/api/'; // Proxy base URL
    const loadingElement = document.getElementById('loading');
    const cardContainer = document.getElementById('cardContainer'); // Container for cards

    // Fetch the clan data
    fetch(clanApiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error: Clan API returned ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status !== 'ok') {
                throw new Error('Invalid response status from Clan API');
            }
            displayTitle(data.data); // Display the clan title
            fetchAndDisplayMembers(data.data);
        })
        .catch(error => {
            console.error('Error fetching clan data:', error);
            loadingElement.textContent = 'Failed to load data from Clan API.';
        });

    // Display the clan title with the Icon
    function displayTitle(clanData) {
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
    

    // Fetch user details and avatar URLs, then populate the cards
    async function fetchAndDisplayMembers(data) {
        let members = [
            ...data.Members,
            { UserID: data.Owner, PermissionLevel: 'Owner', JoinTime: data.Created }, // Add owner with Created date as JoinTime
        ];
    
        const diamondContributions = data.DiamondContributions?.AllTime?.Data || [];
        const battles = data.Battles || {}; // Extract battle data
    
        // Load battles.json to get start dates for battles
        let battleMetadata = {};
        try {
            const response = await fetch('assets/data/battles.json'); // Ensure the file path is correct
            if (!response.ok) {
                throw new Error(`Failed to fetch battles.json: ${response.status}`);
            }
            const battlesJson = await response.json();
            battleMetadata = Object.fromEntries(
                battlesJson.map((battle) => [battle.BattleID, battle.StartDate])
            );
        } catch (error) {
            console.error('Error loading battles.json:', error);
        }

        // Initialize medal counts and battleMedals for each member
        members.forEach((member) => {
            member.medals = { Bronze: 0, Silver: 0, Gold: 0 };
            member.battleMedals = {}; // Store battle ID and medal type for hover tooltips
        });
    
        // Adjust joinTime and count medals for each user based on battles
        for (const [battleID, battleData] of Object.entries(battles)) {
            const battleStartDate = battleMetadata[battleID]
                ? new Date(battleMetadata[battleID]).getTime() / 1000 // Convert to timestamp
                : null;

            if (battleData.ProcessedAwards && battleStartDate) {
                battleData.AwardUserIDs.forEach((userID) => {
                    const member = members.find((m) => m.UserID === userID);
                    if (member) {
                        // Count medals
                        const earnedMedal = battleData.EarnedMedal;
                        if (earnedMedal) {
                            member.medals[earnedMedal] =
                                (member.medals[earnedMedal] || 0) + 1;
                            member.battleMedals[battleID] = earnedMedal;
                        }

                        // Update joinTime if this battle's start date is earlier
                        if (!member.JoinTime || battleStartDate < member.JoinTime) {
                            member.JoinTime = battleStartDate;
                        }
                    }
                });
            }
        }
    
        // Fetch and update the name, displayName, and description fields for each member
        await Promise.all(
            members.map(async (member) => {
                try {
                    const userResponse = await fetch(`${proxyBaseUrl}user/${member.UserID}`);
                    if (!userResponse.ok) {
                        console.warn(`Skipping UserID ${member.UserID}: User API returned ${userResponse.status}`);
                        return;
                    }
                    const userData = await userResponse.json();
                    member.name = userData.name; // Update the member's name
                    member.displayName = userData.displayName; // Update the member's display name
                    member.description = userData.description; // Update the member's description
                    member.created = userData.created; // Update the account creation date
                } catch (error) {
                    console.error(`Error fetching user data for UserID ${member.UserID}:`, error);
                }
            })
        );
    
        // Sort members: Owner > Officers (alphabetically) > Members (alphabetically by name)
        members.sort((a, b) => {
            if (a.PermissionLevel === 'Owner') return -1;
            if (b.PermissionLevel === 'Owner') return 1;
            if (a.PermissionLevel === 90 && b.PermissionLevel !== 90) return -1;
            if (b.PermissionLevel === 90 && a.PermissionLevel !== 90) return 1;
    
            const aName = String(a.name || ''); // Sort by name, fallback to an empty string
            const bName = String(b.name || '');
            return aName.localeCompare(bName);
        });
    
        // Render the sorted members
        for (const member of members) {
            try {
                const avatarResponse = await fetch(`${proxyBaseUrl}avatar/${member.UserID}`);
                if (!avatarResponse.ok) {
                    console.warn(`Skipping UserID ${member.UserID}: Avatar API returned ${avatarResponse.status}`);
                    continue;
                }
                const avatarData = await avatarResponse.json();
                const avatarImageUrl = avatarData.data[0]?.imageUrl || 'No avatar available';
    
                const userContribution = diamondContributions.find((contribution) => contribution.UserID === member.UserID);
    
                // Pass the correct user data to the addCardToContainer function
                addCardToContainer(
                    member,
                    {
                        name: member.name,
                        displayName: member.displayName,
                        description: member.description,
                        created: member.created,
                    },
                    avatarImageUrl,
                    userContribution
                );
            } catch (error) {
                console.error(`Error processing member with UserID ${member.UserID}:`, error);
            }
        }
    
        loadingElement.classList.add('hidden');
    }
    
    
    
    
    

    // Calculate age in years, months, and days
    function calculateAge(date) {
        const birthDate = new Date(date);
        const now = new Date();
    
        let years = now.getFullYear() - birthDate.getFullYear();
        let months = now.getMonth() - birthDate.getMonth();
        let days = now.getDate() - birthDate.getDate();
    
        if (days < 0) {
            months -= 1;
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years -= 1;
            months += 12;
        }
    
        const ageParts = [];
        if (years > 0) ageParts.push(`${years} years`);
        if (months > 0) ageParts.push(`${months} months`);
        if (days > 0) ageParts.push(`${days} days`);
    
        return ageParts.join(', ');
    }
    

    // Add a card to the container
    function addCardToContainer(member, userData, avatarImageUrl, userContribution) {
        const robloxProfileUrl = `https://www.roblox.com/users/${member.UserID}/profile`;
    
        // Format dates for hover tooltips
        const accountCreationDate = userData.created
            ? new Date(userData.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';
        const joinDate = member.JoinTime
            ? new Date(member.JoinTime * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';
    
        const accountAge = userData.created ? calculateAge(userData.created) : '';
        const joinAge = member.JoinTime ? calculateAge(new Date(member.JoinTime * 1000)) : '';
    
        let permissionLevel, permissionClass;
        if (member.PermissionLevel === 'Owner') {
            permissionLevel = 'Owner';
            permissionClass = 'owner';
        } else if (member.PermissionLevel === 90) {
            permissionLevel = 'Officer';
            permissionClass = 'officer';
        } else {
            permissionLevel = 'Member';
            permissionClass = 'member';
        }
    
        // Generate medal icons with hover tooltips
        const medalIconsHTML = Object.entries(member.battleMedals || {})
            .map(
                ([battleID, medal]) =>
                    `<img src="assets/images/${medal}.png" alt="${medal} Medal" title="Battle: ${battleID}" class="medal-icon">`
            )
            .join('');
    
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <img src="${avatarImageUrl}" alt="Avatar" class="avatar">
            <div class="card-content">
                <h3>
                    <a href="${robloxProfileUrl}" target="_blank" rel="noopener noreferrer">${userData.name}</a>
                </h3>
                <p class="username">(@${userData.displayName})</p>
                <p class="permission-level ${member.PermissionLevel === 'Owner' ? 'owner' : member.PermissionLevel === 90 ? 'officer' : 'member'}">
                    <span>${member.PermissionLevel === 'Owner' ? 'Owner' : member.PermissionLevel === 90 ? 'Officer' : 'Member'}</span>
                </p>
                ${
                    joinAge
                        ? `<p title="Joined on ${joinDate}"><img src="assets/images/Huge_Party_Monkey.png" alt="Join Age" class="icon"> ${joinAge}</p>`
                        : ''
                }
                <div class="medals-container">${medalIconsHTML}</div>
                <p>
                    <img src="assets/images/Diamonds.webp" alt="Diamonds" class="icon"> 
                    ${userContribution ? userContribution.Diamonds.toLocaleString() : 0}
                </p>
                ${
                    accountAge
                        ? `<p title="Created on ${accountCreationDate}"><img src="assets/images/Roblox.svg" alt="Roblox Age" class="icon"> ${accountAge}</p>`
                        : ''
                }
                ${
                    userData.description
                        ? `<p class="description"><span>${userData.description}</span></p>`
                        : ''
                }
            </div>
        `;
        cardContainer.appendChild(card);
    }
    

    
});
