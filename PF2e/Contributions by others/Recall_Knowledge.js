/*
Based on the macro by bipedalshark and WesBelmont.
updated by darkim

Recall Knowledge
This macro will roll several knowledge checks if no target is selected.
If one ore more targets are selected it will only roll the relevant knowledge skills and compare the result to the DC.

Limitations:
* Does not handle assurance.
* Does not handle things like bardic knowledge.
* Does not handle lore skills (yet)
*/

function RKChatMessageEvent(cm, jq) {
	if (game.user.isGM) return;
	const html = jq[0];
        //confine hidden messages to only those from this macro
	if (cm.flags.pf2e.recall) { html.style.display = 'none' };
}

//Do not enable if the module Actually Private Rolls is enabled to prevent double hooks.
if (!game.modules.get("actually-private-rolls")?.active) { Hooks.on('renderChatMessage', RKChatMessageEvent); }

const SKILL_OPTIONS = ["arc", "cra", "med", "nat", "occ", "rel", "soc"];
const IDENTIFY_SKILLS = {aberration: "occ",astral: "occ",animal: "nat",beast: ["arc", "nat"] ,celestial: "rel",construct: ["arc", "cra"],dragon: "arc",elemental: ["arc", "nat"],ethereal: "occ",fey: "nat",fiend: "rel",fungus: "nat",humanoid: "soc",monitor: "rel",ooze: "occ",plant: "nat",spirit: "occ",undead: "rel"};

if (canvas.tokens.controlled.length !== 1){
    ui.notifications.warn('You need to select exactly one token to perform Recall Knowledge.');
  } else if (game.user.targets.size < 1){
    // do all checks
    for (const token of canvas.tokens.controlled) {
        var my_string = ``
        for (primaryskill of SKILL_OPTIONS) {
            const coreSkill = token.actor.system.skills[primaryskill];
            const coreRoll = await new Roll(
                `1d20 + ${coreSkill.totalModifier}`
            ).roll({ async: true });
            const rollColor = {
                20: "green",
                1: "red"
            }[coreRoll.terms[0].results[0].result] ?? "black";

            my_string += `<br>${
                coreSkill.slug[0].toUpperCase() + coreSkill.slug.substring(1)
                }+${coreSkill.totalModifier} <span style="color: ${rollColor}">[[${coreRoll.total}]]</span>`
        } 
    }

    await ChatMessage.create({
        user: game.userId,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: `<strong>Recall Knowledge Roll:</strong>
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
        let my_string = ``;
 
        for(let target of game.user.targets){
            let targetActor = target.actor;
            let primaryskills = []

            level = targetActor.system.details.level.value;
            actortype = targetActor.system.traits.value
            rarity = targetActor.rarity == 'uncommon' ? 2 : targetActor.rarity == 'rare' ? 5 : targetActor.rarity == 'unique' ? 10 : 0;

            if (targetActor.type !== "character") {
                for (const key in IDENTIFY_SKILLS) {
                    const element = IDENTIFY_SKILLS[key];
                    if (actortype.includes(key)){
                        primaryskills = primaryskills.concat(element)
                    }
                }
            }

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
            my_string += `<br><strong>vs. ${targetActor.name}</strong><br>1st: DC ${dcs[0]}; 2nd: DC ${dcs[1]}; 3rd: DC ${dcs[2]}; 4th: DC ${dcs[3]}`;
            for (primaryskill of primaryskills) {
                const coreSkill = token.actor.system.skills[primaryskill];
                const coreRoll = await new Roll(
                    `1d20 + ${coreSkill.totalModifier}`
                ).roll({ async: true });

                const atot = coreRoll.total - dcs[0];
                let success = atot >= 10 ? 3 : atot >= 0 ? 2 : atot <= -10 ? 0 : 1;
                success += (coreRoll.terms[0].results[0].result === 1) ? -1 : (coreRoll.terms[0].results[0].result === 20) ? 1 : 0;
                success = Math.min(Math.max(success, 0), 3)

                const rollColor = {
                    20: "green",
                    1: "red"
                }[coreRoll.terms[0].results[0].result] ?? "black";
                const outcome = {
                    3: "Critical Success",
                    2: "Success",
                    1: "Failure",
                    0: "Critical Failure",
                }[success];
                const outcomeColor = {
                    true: "green",
                    false: "red"
                }[success>=2];

                my_string += `<br>${
                    coreSkill.slug[0].toUpperCase() + coreSkill.slug.substring(1)
                    }+${coreSkill.totalModifier} <span style="color: ${rollColor}">[[${coreRoll.total}]]</span> = <span
                    style="color: ${outcomeColor}">${outcome}</span>`
            } 
        }

        await ChatMessage.create({
            user: game.userId,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: `<strong>Recall Knowledge Roll:</strong>
            ${my_string}`,
            visible: false,
            whisper: game.users.contents.flatMap((user) => (user.isGM ? user.id : [])),
            blind: true,
            speaker: await ChatMessage.getSpeaker(),
            flags: {pf2e: { recall: true } },
        });
        ui.notifications.info(`${token.name} tries to remember if they've heard something related to this.`)
    }
  }
