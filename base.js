/*
* @Author: Kotri Lv.199
* @Date:   2019-12-02 15:34:03
* @Last Modified by:   Kotri Lv.192
* @Last Modified time: 2019-12-04 22:56:19
*
* Base Code for Serverless Old Tieba
*/

'use strict';
'use very strict';

/* constants */
const githubAPI = '//api.github.com/graphql';
const githubUserLoginAPI = '//api.github.com/user';

const DEFAULT_REPO_OWNER = "kotritrona";
const DEFAULT_REPO_NAME = "postbar";
const DEFAULT_REPO_ID = "MDEwOlJlcG9zaXRvcnkyMjUzODYxMzI=";

const LABEL_DIGEST = "digest";
const DIGEST_LABEL_ID = "MDU6TGFiZWwxNzEwMDM0OTcx";

const CLIENT_ID = "8c6cd13deb1270c3bf8c";
const CLIENT_SECRET = "f52ce7a9441822d1958c275aa874a747b8bcc7c9";
const APP_SCOPE = "public_repo";
const DEFAULT_ACCESS_TOKEN = "c0a78e5a81a128158ca5025360da13d447002875";

const REDIRECT_URI = "https://kotritrona.github.io/postbar/oauth.html";
const EMOTE_DIR = "https://kotritrona.github.io/postbar/em/";

const DEFAULT_BAR_NAME = "Kotri_Lv.216";
const MEMBER_NAME = "\u4F1A\u5458";

const BAR_FILE = "bar.html";
const POST_FILE = "post.html";

const ANONYMOUS = "\u533F\u540D";
const ANONYMOUS_URL = "#anonymous";

const POST_BANNER_IMAGE_COUNT = 50;

const SCORE_DELTA_TOPIC = 5;
const SCORE_DELTA_REPLY = 3;

// TODO fix the level thresholds
const EXP_LEVELS = [-999999, 0, 5, 15, 30, 50, 100, 200, 500, 1000, 2000, 3000, 6000, 10000, 18000, 30000, 60000, 100000, 300000];
const EXP_TITLES = ["\u65e0", "\u521d\u7ea7\u7c89\u4e1d", "\u4e2d\u7ea7\u7c89\u4e1d", "\u9ad8\u7ea7\u7c89\u4e1d", "\u5165\u95e8\u4f1a\u5458", "\u6b63\u5f0f\u4f1a\u5458", "\u6838\u5fc3\u4f1a\u5458", "\u6838\u5fc3\u4f1a\u5458", "\u94c1\u6746\u4f1a\u5458", "\u94c1\u6746\u4f1a\u5458", "\u77e5\u540d\u4eba\u58eb", "\u77e5\u540d\u4eba\u58eb", "\u4eba\u6c14\u6977\u6a21", "\u4eba\u6c14\u6977\u6a21", "\u610f\u89c1\u9886\u8896", "\u610f\u89c1\u9886\u8896", "\u8fdb\u9636\u5143\u8001", "\u8d44\u6df1\u5143\u8001", "\u8363\u8000\u5143\u8001"];
const EXP_BADGE_LEVELS = [-1,0,6,10,14];

const LOCAL_STORAGE_KEY = "PostbarUser";

/* global variables */
let gUserData = {
    loggedIn : false,
    accessToken : DEFAULT_ACCESS_TOKEN,
    nodeID : "",
    login : "",
    avatarUrl : "",
    score : 0
};

let gRepo = {
    id : DEFAULT_REPO_ID,
    name : DEFAULT_REPO_NAME,
    owner : DEFAULT_REPO_OWNER,
    bar : DEFAULT_BAR_NAME
};

/*
 *  Runs a graphQL query on a specified API location.
 *  @param      url : string
 *  @param      query : string
 *  @param      vars : object
 *  @param      auth : string
 *
 *  @returns    handle : Promise (
 *                           res : object : query result
 *                       )
 */
function graphQL(url, query, vars, auth) {
    return fetch(url, {
        headers: auth? {
            // Include the token in the Authorization header
            Authorization: 'token ' + auth
        } : undefined,
        method: "POST",
        body: JSON.stringify({
            query: query,
            variables: vars ? vars : undefined
        })
    }).then(res => res.json());
}

/*
 *  Runs a graphQL query on Github API.
 *  @param      query : string
 *  @param      vars : object
 *  @param      authBool : bool
 *
 *  @returns    handle : Promise (
 *                           res : object : query result
 *                       )
 */
function githubQL(query, vars, authBool) {
    return graphQL(githubAPI, query, vars, authBool ? gUserData.accessToken : undefined);
}

/* Shortcut functions for DOM manipulation */
function $A(z) {
    return Array.from(document.querySelectorAll(z));
}

function $Q(z) {
    return document.querySelector(z);
}

function $I(z) {
    return document.getElementById(z);
}

function $C(z) {
    return document.createElement(z);
}

/* https://stackoverflow.com/questions/8648892/convert-url-parameters-to-a-javascript-object/8649003 */
function parseSearchParams() {
    var search = location.search.substring(1);
    let params = new URLSearchParams(search);
    function paramsToObject(entries) {
      let result = {}
      for(let entry of entries) { // each 'entry' is a [key, value] tupple
        const [key, value] = entry;
        result[key] = value;
      }
      return result;
    }
    return paramsToObject(params);
}


/*
 *  Returns a request URL for Github Apps based on given client ID, app scope and redirect URI.
 *
 *  @returns    url : string
 */
function getGithubLoginURL() {
    return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${APP_SCOPE}&redirect_uri=${REDIRECT_URI}`;
}

/* Saves the score in local storage */
function saveScore() {
    localStorage.setItem("PostbarScore", gUserData.score);
}

/* Loads the score from local storage */
function loadScore() {
    const storedUserScore = parseInt(localStorage.getItem("PostbarScore"), 10);
    if(isFinite(storedUserScore)) {
        gUserData.score = storedUserScore;
        return storedUserScore;
    }
    gUserData.score = 0;
    return 0;
}

/*
 * Add the score by a delta amount and saves it in local storage
 *
 *  @param delta : number
 *
 */
function updateScore(delta) {
    if(delta) {
        gUserData.score += delta;
    }
    updateScoreWith(gUserData.score);
    saveScore();
}

/*
 * Set score to a specific amount, and displays on the UI including the related level, remaining-score and images. Saving is not included
 *
 *  @param xp : number
 */
function updateScoreWith(xp)
{
    let lvl = 0;
    let badge = 1;
    for(let i=0;i<EXP_LEVELS.length;i++) {
        if(xp >= EXP_LEVELS[i]) {
            lvl = i;
        }
        else {
            break;
        }
    }
    for(let i=1;i<EXP_BADGE_LEVELS.length;i++) {
        if(lvl >= EXP_BADGE_LEVELS[i]) {
            badge = i;
        }
        else {
            break;
        }
    }
    let tit1 = "\u672c\u5427\u5934\u8854" + lvl + "\u7ea7\uff0c\u7ecf\u9a8c\u503c" + xp + "\uff0c\u70b9\u51fb\u8fdb\u5165\u672c\u5427\u5934\u8854\u8bf4\u660e\u9875";
    let tit2 = "\u5f53\u524d\u7ecf\u9a8c\u503c\u4e3a" + xp;
    if(xp < EXP_LEVELS[EXP_LEVELS.length-1]) {
        tit2 += "\uff0c\u8fd8\u9700\u7ecf\u9a8c\u503c" + (EXP_LEVELS[lvl+1] - xp) + "\u5373\u53ef\u5347\u81f3" + (lvl+1) + "\u7ea7\uff0c\u70b9\u51fb\u540e\u53ef\u4ee5\u67e5\u770b\u5347\u7ea7\u79d8\u7c4d";
    }

    $I("liked_member_title2").innerHTML = EXP_TITLES[lvl];
    $I("exp_badge_level2").innerHTML = lvl;
    $I("userlike_expnum_cur2").innerHTML = xp;
    $I("userlike_expnum_max2").innerHTML = EXP_LEVELS[lvl+1] || "&#8734;";
    $I("exp_badge_base2").title = tit1;
    $I("exp_badge_base2").className = "userlike_badge badge_lv" + badge;
    $I("userlike_expbar2").title = tit2;
    if(xp >= EXP_LEVELS[EXP_LEVELS.length-1]) {
        $I("exp_num_bar2").style.width = "100%";
    }
    else {
        if(((xp - EXP_LEVELS[lvl]) / (EXP_LEVELS[lvl+1] - EXP_LEVELS[lvl]) * 100) < 1) {
            $I("exp_num_bar2").style.width = "1%";
        }
        else {
            $I("exp_num_bar2").style.width = ((xp - EXP_LEVELS[lvl]) / (EXP_LEVELS[lvl+1] - EXP_LEVELS[lvl]) * 100) + "%";
        }
    }
}

/*
 * Inserts a snippet of text to the textarea element
 *
 *  @param ci : string : selector of textarea
 *  @param l : string : added text
 *  @param r : bool/string : true if replace the current selection, string for content added after selection and not replace
 */
function insertContentToTextarea(ci, l, r) {
    var c = $Q(ci);
    r = r || "";
    if(typeof c.selectionStart == 'number' && typeof c.selectionEnd == 'number') {
        c.focus();
        var v = c.value;
        var s = c.selectionStart;
        var k = c.selectionEnd - c.selectionStart;
        if(r === true) {
            c.value = v.substring(0, c.selectionStart) + l + v.substring(c.selectionEnd, v.length);
            c.selectionStart = s + l.length;
            c.selectionEnd = s + l.length;
        }
        else {
            c.value = v.substring(0, c.selectionStart) + l + v.substring(c.selectionStart, c.selectionEnd) + r + v.substring(c.selectionEnd, v.length);
            c.selectionStart = s + l.length;
            c.selectionEnd = s + l.length + k;
        }
    }
    else {
        if(r === true) {
            r = "";
        }
        c.value += l + r;
    }
}

/*
 * Unbound event handler for adding emotion images
 *
 *  @param targetSelector : string : selector of target textarea
 *  @param emoteURL : string : image URL
 *  @param evt : unused
 */
function unboundEvtAddEmote(targetSelector, emoteURL, evt) {
    insertContentToTextarea(targetSelector, "![](" + emoteURL + ")", true);
    return false;
}

/*
 * Generate list of emotion images in a container
 * The image file names and preview image is hardcoded, if willing to replace the images you can use an array
 * const arrayOfImages = [...URL]
 * let t = arrayOfImages[i]
 * ele.style.background = `url(${t}) 0 0`
 *
 *  @param emotionBarSelector : string : selector of container for selecting images
 *  @param targetSelector : string : selector of target textarea
 *
 */
function generateEmotions(emotionBarSelector, targetSelector) {
    let emotionBar = $Q(emotionBarSelector);
    targetSelector = targetSelector || "#textInput";
    for(var i=1;i<63;i++)
    {
        var t = EMOTE_DIR + "b" + (i<10?"0"+i:""+i) + ".gif";
        var ele = $C("a");
        ele.onclick = unboundEvtAddEmote.bind(null, targetSelector, t);
        ele.style.display = "inline-block";
        ele.style.height = "35px";
        ele.style.width = "35px";
        ele.style.background = `url("${EMOTE_DIR}bprev.gif") 0 -${ 35 * (i-1) }px`;
        ele.style.margin = "5px";
        ele.style.cursor = "pointer";
        ele.animate = "false";
        emotionBar.appendChild(ele);
    }
}

