/*
Based on the macro by bipedalshark and WesBelmont and darkim.
updated by Allalinor

Recall Knowledge
This macro will roll several knowledge checks if no target is selected.
If one ore more targets are selected it will only roll the relevant knowledge skills and compare the result to the DC.
Handles lore skills (as far as possible)

Limitations:
* Does not handle assurance.
* Does not handle things like bardic knowledge.
*/

/**
* Global d20 roll used for all skills.
*/
let globalroll = await new Roll("1d20").roll({ async: true }); 

   
            const rollColor = {
                20: "green",
                1: "red"
            }[globalroll.terms[0].results[0].result] ?? "black";


/**
* Get lore skills from current actor
*/
function getLoreSkillsSlugs(token) {
    let loreSkillsSlugs = [];
    for (const skill of Object.entries(token.actor.system.skills)) {
        if (skill[1].lore) {
            loreSkillsSlugs.push(skill[1].slug)
        }
    };
    return loreSkillsSlugs;
}

function RKChatMessageEvent(cm, jq) {
	if (game.user.isGM) return;
	const html = jq[0];
        //confine hidden messages to only those from this macro
	if (cm.flags.pf2e.recall) { html.style.display = 'none' };
}

//Do not enable if the module Actually Private Rolls is enabled to prevent double hooks.
if (!game.modules.get("actually-private-rolls")?.active) { Hooks.on('renderChatMessage', RKChatMessageEvent); }

const SKILL_OPTIONS = ["arc", "cra", "med", "nat", "occ", "rel", "soc"];
const IDENTIFY_SKILLS = {aberration: "occ",astral: "occ",animal: "nat",beast: ["arc", "nat"] ,celestial: "rel",construct: ["arc", "cra"],dragon: "arc",elemental: ["arc", "nat"],ethereal: "occ",fey: "nat",fiend: "rel",fungus: "nat",giant: "soc",humanoid: "soc",monitor: "rel",ooze: "occ",plant: "nat",spirit: "occ",undead: "rel"};

if (canvas.tokens.controlled.length !== 1){
    ui.notifications.warn('You need to select exactly one token to perform Recall Knowledge.');
  } else if (game.user.targets.size < 1){
    // do all checks
    for (const token of canvas.tokens.controlled) {
        const LORE_SKILL_SLUGS = getLoreSkillsSlugs(token);
        let LORE_AND_SKILL_OPTIONS = SKILL_OPTIONS;
        LORE_AND_SKILL_OPTIONS.push(...LORE_SKILL_SLUGS);
        var my_string = ``
        for (primaryskill of SKILL_OPTIONS) {
            const coreSkill = token.actor.system.skills[primaryskill];
            const coreRoll = Number(globalroll.total) + Number(coreSkill.totalModifier);

            const rankColor = {
                untrained: "#443730",
                trained: "#171f69",
                expert: "#3c005e",
                master: "#5e4000",
                legendary: "#5e0000",
            }[coreSkill._modifiers[1].label.toLowerCase()];

            my_string += `<tr><th>${coreSkill.slug[0].toUpperCase() + coreSkill.slug.substring(1)}</th>
                          <th class="tags"><div class="tag" style="background-color: ${rankColor}; white-space:nowrap">${coreSkill._modifiers[1].label}</th>
                          <th>${coreSkill.totalModifier}</th>
                          <th><span style="color: ${rollColor}">[[${coreRoll}]]</span></th></tr>`
        } 
    }

    await ChatMessage.create({
        user: game.userId,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: `<strong>Recall Knowledge</strong>
        <br><strong>Roll: </strong><span style="color: ${rollColor}">[[${globalroll.total}]]</span>
        <table>
        <tr>
        <th>Skill</th>
        <th>Prof</th>
        <th>Mod</th>
        <th>Result</th>
        ${my_string}`,
        whisper: game.users.contents.flatMap((user) => (user.isGM ? user.id : [])),
        visible: false,
        blind: true,
        speaker: ChatMessage.getSpeaker(),
        flags: {pf2e: { recall: true } },
    });
    ui.notifications.info(`${token.name} tries to remember if they've heard something related to this.`)
  } else {
    // do the correct check(s)
    for (const token of canvas.tokens.controlled) {
        const LORE_SKILL_SLUGS = getLoreSkillsSlugs(token);
        let my_string = ``;
        let my_string2 =``;
 
        for(let target of game.user.targets){
            let targetActor = target.actor;
            let primaryskills = [];

            level = targetActor.system.details.level.value;
            actortype = targetActor.system.traits.value;
            rarity = targetActor.rarity == 'uncommon' ? 2 : targetActor.rarity == 'rare' ? 5 : targetActor.rarity == 'unique' ? 10 : 0;

            if (targetActor.type !== "character") {
                for (const key in IDENTIFY_SKILLS) {
                    const element = IDENTIFY_SKILLS[key];
                    if (actortype.includes(key)){
                        primaryskills = primaryskills.concat(element)
                    }
                }
            }
            // remove duplicate skills
            primaryskills = [...new Set(primaryskills)];

            if(level>20) {
                dc = level * 2;
            } else {
                dc = 14 + level + ((level < 0) ? 0 : Math.floor(level/3));
            }
            let dcs = ["", "-", "-", "-"];
            dcs[0] = dc + rarity;
            switch (rarity){
                case 0:
                    dcs[1] = dc+2;
                    dcs[2] = dc+5;
                    dcs[3] = dc+10;
                    break;
                case 2:
                    dcs[1] = dc+5;
                    dcs[2] = dc+10;
                    break;
                case 5:
                    dcs[1] = dc+10;
                    break;
                default:  
                    break; 
            }
            my_string += `<br><strong>vs. ${targetActor.name}</strong><table>
                <tr>
                    <td>DCs</td>
                    <td>Total</td>
                    <td>1st: <strong>${dcs[0]}</strong></td>
                    <td>2nd: <strong>${dcs[1]}</strong></td>
                    <td>3rd: <strong>${dcs[2]}</strong></td>
                    <td>4th: <strong>${dcs[3]}</strong></td>
                </tr>`;
            for (primaryskill of primaryskills) {
                const coreSkill = token.actor.system.skills[primaryskill];
                const coreRoll = Number(globalroll.total) + Number(coreSkill.totalModifier);

                const rankColor = {
                    untrained: "#443730",
                    trained: "#171f69",
                    expert: "#3c005e",
                    master: "#5e4000",
                    legendary: "#5e0000",
                }[coreSkill._modifiers[1].label.toLowerCase()];

                my_string += `<tr>
                    <td><label title="${coreSkill.slug[0].toUpperCase() + coreSkill.slug.substring(1)} (${coreSkill._modifiers[1].label}) Roll: ${globalroll.total} + ${coreSkill.totalModifier}">${coreSkill.slug[0].toUpperCase() + coreSkill.slug.substring(1,5)}</label></td>
                <th><span style="color: ${rollColor}">[[${coreRoll}]]</span></th> 
                `;

                my_string2 += `<tr>
                <th>${coreSkill.slug[0].toUpperCase() + coreSkill.slug.substring(1)}</th>
                <th class="tags"><div class="tag" style="background-color: ${rankColor}; white-space:nowrap">${coreSkill._modifiers[1].label}</th>
                <th>${coreSkill.totalModifier}</th> 
                <th><span style="color: ${rollColor}">[[${coreRoll}]]</span></th></tr>`;

                for (realDc of dcs) {
                    if (!isNaN(realDc)) {
                        const atot = coreRoll - realDc;
                        let success = atot >= 10 ? 3 : atot >= 0 ? 2 : atot <= -10 ? 0 : 1;
                        success += (globalroll.total === 1) ? -1 : (globalroll.total === 20) ? 1 : 0;
                        success = Math.min(Math.max(success, 0), 3)

                        const outcome = {
                            3: "CrSuc",
                            2: "Suc",
                            1: "Fail",
                            0: "CrFail",
                        }[success];
                        const outcomeColor = {
                            true: "green",
                            false: "red"
                        }[success>=2];
                        my_string += `<td style='text-align:center; vertical-align:middle'><span style="color: ${outcomeColor}; bgcolor: "red">${outcome}</span></td>`;
                    } else {
                        my_string += `<td style='text-align:center; vertical-align:middle; bgcolor: "red"'>-</td>`;
                    }
                }
                my_string += ` </tr>`;
               
            }

            my_string += `</table>`;
            let lore_dcs = ["", "-", "-", "-", "-", "-"];
            switch (rarity){
                case 0:
                    lore_dcs[0] = dc-5;
                    lore_dcs[1] = dc-2;
                    lore_dcs[2] = dc;
                    lore_dcs[3] = dc+2;
                    lore_dcs[4] = dc+5;
                    lore_dcs[5] = dc+10;
                    break;
                case 2:
                    lore_dcs[0] = dc-2;
                    lore_dcs[1] = dc;
                    lore_dcs[2] = dc+2;
                    lore_dcs[3] = dc+5;
                    lore_dcs[4] = dc+10;
                    break;
                case 5:
                    lore_dcs[0] = dc;
                    lore_dcs[1] = dc+2;
                    lore_dcs[2] = dc+5;
                    lore_dcs[3] = dc+10;
                    break;
                case 10:
                    lore_dcs[0] = dc+2;
                    lore_dcs[1] = dc+5;
                    lore_dcs[2] = dc+10;
                    break;
                default:  
                    break; 
            }
            // my_string += `<br><strong>Lore Skills</strong><br><strong>Unspecific:</strong> 1st: DC ${lore_dcs[1]}; 2nd: DC ${lore_dcs[2]}; 3rd: DC ${lore_dcs[3]}; 4th: DC ${lore_dcs[4]}; 5th: DC ${lore_dcs[5]}`;
            my_string += `<table>
                <tr>
                    <th>Lore Skill DCs</th>
                    <th>1st</th>
                    <th>2nd</th>
                    <th>3rd</th>
                    <th>4th</th>
                    <th>5th</th>
                    <th>6th</th>
                </tr>
                <tr>
                    <td>Unspecific</td>
                    <td>${lore_dcs[1]}</td>
                    <td>${lore_dcs[2]}</td>
                    <td>${lore_dcs[3]}</td>
                    <td>${lore_dcs[4]}</td>
                    <td>${lore_dcs[5]}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Specific</td>
                    <td>${lore_dcs[0]}</td>
                    <td>${lore_dcs[1]}</td>
                    <td>${lore_dcs[2]}</td>
                    <td>${lore_dcs[3]}</td>
                    <td>${lore_dcs[4]}</td>
                    <td>${lore_dcs[5]}</td>
                </tr>
            </table>`;

            for (loreSKillSlug of LORE_SKILL_SLUGS) {
                const loreSkill = token.actor.system.skills[loreSKillSlug];
                const loreRoll = Number(globalroll.total) + Number(loreSkill.totalModifier);

                const rankColor = {
                    untrained: "#443730",
                    trained: "#171f69",
                    expert: "#3c005e",
                    master: "#5e4000",
                    legendary: "#5e0000",
                }[loreSkill._modifiers[1].label.toLowerCase()];

                my_string += `<table>
                <tr>
                <th>Skill</th>
                <th>Prof</th>
                <th>Mod</th>
                <th>Result</th>`

                my_string += `<tr><td>${loreSkill.label}</td>
                               <td class="tags"><div class="tag" style="background-color: ${rankColor}; white-space:nowrap">${loreSkill._modifiers[1].label}</td>
                               <td>${loreSkill.totalModifier}</td>
                               <td><span style="color: ${rollColor}">[[${loreRoll}]]</span></td>`;    
            }
            my_string += `</table>`
        }

        await ChatMessage.create({
            user: game.userId,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: `<strong>Recall Knowledge Roll: </strong><span style="color: ${rollColor}">[[${globalroll.total}]]</span>
            ${my_string}
            `,
            visible: false,
            whisper: game.users.contents.flatMap((user) => (user.isGM ? user.id : [])),
            blind: true,
            speaker: await ChatMessage.getSpeaker(),
            flags: {pf2e: { recall: true } },
        });
        ui.notifications.info(`${token.name} tries to remember if they've heard something related to this.`)
    }
  }
