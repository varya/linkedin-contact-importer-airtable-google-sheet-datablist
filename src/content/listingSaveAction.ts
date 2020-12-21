import { browser } from "webextension-polyfill-ts";
import { LinkedInProfile } from '../Profile'
import { createBtn, hasElement, disableButton } from './button'

const saveResultBtnIdentifier = 'save-result-extension';
const generateBtnId = (elemId: HTMLLIElement) => {
    return `${saveResultBtnIdentifier}-${elemId.id}`;
}


/*
    Search page
*/
function findProfileImage(node: Element): string | null {
    const imageNode = node.querySelector('img');

    if(!imageNode || !imageNode.src)
        return null;

    return imageNode.src;
}

function findProfileLink(node: Element): string | null {
    const linkNode = node.querySelector('a');

    if(!linkNode || !linkNode.textContent)
        return null;

    return linkNode.href;
}

function findProfileName(node: Element): string | null{
    const nameNode = node.querySelector('.name.actor-name');
    if(!nameNode || !nameNode.textContent)
        return null;

    return nameNode.textContent.trim();
}

function findProfileTitle(node: Element): string | null{
    const titleNode = node.querySelector('p.subline-level-1');
    if(!titleNode || !titleNode.textContent)
        return null;

    return titleNode.textContent.trim();
}

function onClickListingResult(e: MouseEvent): void {
    const target = e.target as HTMLButtonElement;
    if(!target) return;

    // Find listing item ancestor
    const resultListingElement = target.closest("li.search-result");
    if(!resultListingElement) return

    const infoNode = resultListingElement.querySelector('.search-result__info');
    if(!infoNode) return

    const profile:LinkedInProfile = {
        name: findProfileName(infoNode),
        link: findProfileLink(infoNode),
        title: findProfileTitle(infoNode),
        imageSrc: findProfileImage(resultListingElement)
    }

    browser.runtime.sendMessage({
        action: "saveProfiles",
        payload: [profile]
    });

    // Remplace btn text
    const successText = "Imported!"
    if(target.nodeName.toLowerCase() !== "button"){ // Mean click on inner elem in button
        const btnNode = target.closest("button");
        if(btnNode){
            disableButton(btnNode, successText)
        }
    }else{
        disableButton(target, successText)
    }

    e.preventDefault();
}


export const renderSearchResultsBtn = async (resultListingElements: NodeListOf<HTMLLIElement>) => {
    for (const resultListingElement of Array.from(resultListingElements)) {
        const btnId = generateBtnId(resultListingElement)

        if(!hasElement(btnId, resultListingElement)){
            const btn = await createBtn({
                btnIdentifier: btnId
            });
            btn.addEventListener('click', onClickListingResult, false);
            const actionsNode = resultListingElement.querySelector('.search-result__actions');
            if(actionsNode){
                actionsNode.appendChild(btn);
            }
        }
    }
};


function onClickSaveAll(e: MouseEvent): void {
    const target = e.target as HTMLButtonElement;
    if(!target) return;

    // Find listing items
    const resultListingElements = document.querySelectorAll("li.search-result") as NodeListOf<HTMLLIElement>;

    const profiles = [];

    for (const resultListingElement of Array.from(resultListingElements)) {
        const infoNode = resultListingElement.querySelector('.search-result__info');

        if(infoNode){
            const profile:LinkedInProfile = {
                name: findProfileName(infoNode),
                link: findProfileLink(infoNode),
                title: findProfileTitle(infoNode),
                imageSrc: findProfileImage(resultListingElement)
            }

            // Remplace btn text
            const btnId = generateBtnId(resultListingElement)
            const btn = resultListingElement.querySelector('#' + btnId);

            if(btn){
                disableButton(btn as HTMLButtonElement, 'Imported!')
            }

            profiles.push(profile)
        }
    }

    browser.runtime.sendMessage({
        action: "saveProfiles",
        payload: profiles
    });

    // Remplace btn text
    const successText = `Imported ${profiles.length} profiles!`;
    if(target.nodeName.toLowerCase() !== "button"){ // Mean click on inner elem in button
        const btnNode = target.closest("button");
        if(btnNode){
            disableButton(btnNode, successText)
        }
    }else{
        disableButton(target, successText)
    }

    e.preventDefault();
}

const saveAllId = "save-all-extension"

export const renderSaveAllBtn = async (totalNode: HTMLDivElement | null) => {
    if(!totalNode) return

    const parent = totalNode.parentNode;
    if(!parent) return;

    async function addBtnToDiv(divElem: HTMLDivElement){
        const btn = await createBtn({
            btnIdentifier: saveAllId + '-btn',
            className: 'artdeco-button artdeco-button--tertiary',
            text: 'Save all profiles'
        });
        btn.addEventListener('click', onClickSaveAll, false);

        divElem.appendChild(btn)
    }

    // ?keywords=XXX&origin=GLOBAL_SEARCH_HEADER&page=3
    const resultPageNumber = new URLSearchParams(window.location.search).get('page') || "0";

    if(!hasElement(saveAllId, parent as Element)){
        // Place the button before the pagination, on the right
        const divElem = document.createElement('div');
        divElem.id = saveAllId;
        divElem.style.textAlign = "right";
        divElem.style.paddingRight = "20px";
        divElem.dataset.page = resultPageNumber;

        addBtnToDiv(divElem)

        totalNode.before(divElem);
    } else {
        // Refresh btn on page change
        const divElem = parent.querySelector('#' + saveAllId) as HTMLDivElement;
        if(!divElem) return;

        if(divElem.dataset.page != resultPageNumber){
            const currentBtn = divElem.querySelector('button');
            if(currentBtn) currentBtn.remove()

            addBtnToDiv(divElem)
            divElem.dataset.page = resultPageNumber;
        }
    }
};