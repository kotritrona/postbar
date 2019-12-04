/*
* @Author: Kotri Lv.199
* @Date:   2019-12-02 15:34:03
* @Last Modified by:   Kotri Lv.192
* @Last Modified time: 2019-12-04 23:02:57
*
* Base Code for Serverless Old Tieba
*/

'use strict';
'use very strict';

/* global constants */
const gTopicsConsts = {
    pageTopicCount : 30,
    clicksIntercept : 15,
    clicksMultiplier : 30,
    DATA_EXPUNGED : "[\u6570\u636E\u5220\u9664]"
};

/* global variables */
let gTopicsData = {
    page : 0,
    maxPages : 0,
    cursor : "",
    prevCursors : [],
    nextCursor : "",
    hasPreviousPage : false,
    hasNextPage : false,
    topicCount : 0,
    postCount : 0,
    starCount : 0
};

function getPostLink(number) {
    if(gRepo.owner == DEFAULT_REPO_OWNER && gRepo.name == DEFAULT_REPO_NAME) {
        return POST_FILE + "?kz=" + number;
    }
    else {
        let kw = encodeURIComponent(gRepo.owner + "/" + gRepo.name);
        return POST_FILE + "?kz=" + number + "&kw=" + kw;
    }
}

function getBarName() {
    return gRepo.bar;
}

function getBarURL() {
    if(gRepo.owner == DEFAULT_REPO_OWNER && gRepo.name == DEFAULT_REPO_NAME) {
        return BAR_FILE;
    }
    else {
        let kw = encodeURIComponent(gRepo.owner + "/" + gRepo.name);
        return BAR_FILE + `?kw=${kw}`;
    }
}

function goBackToTopicList() {
    location.replace(getBarURL());
}

function getTopicLabels(labels) {
    let out = [];
    let labelNames = labels.nodes.map(item => item.name);
    if(labelNames.indexOf(LABEL_DIGEST) != -1) {
        out.push(`
            <span class="topic-label">
                [<span class="digestFlagText">\u7CBE\u54C1</span>]
            </span>
        `);
    }
    return out.join(" ");
}

/* Convert date format. */
function formatTimeTopic(di) {
    var dn = new Date();
    var d = new Date(di);
    if(dn.getYear() == d.getYear() && dn.getMonth() == d.getMonth() && dn.getDate() == d.getDate())
    {
        var o = "";
        var k = d.getHours().toString();
        while(k.length<2)
        {
            k = "0" + k;
        }
        o += k + ":";
        var k = d.getMinutes().toString();
        while(k.length<2)
        {
            k = "0" + k;
        }
        o += k;
        return o;
    }
    else
    {
        var o = "";
        var k = (d.getMonth()+1).toString();
        while(k.length<2)
        {
            k = "0" + k;
        }
        o += k + "-";
        var k = d.getDate().toString();
        while(k.length<2)
        {
            k = "0" + k;
        }
        o += k;
        return o;
    }
}


/* #post_insert_here*/
function getTopicHTML(newInfo) {

    // add informations up
    let info = {
        replies: 0,
        title: "Hello World!",
        number: 3,
        labels: [],
        author: "kotritrona",
        authorURL: "",
        lastReplyTime: new Date(),
        lastReplyUser: "kotritrona",
        lastReplyUserURL: ""
    };
    Object.assign(info, newInfo);

    // render html text
    let html = $I("topic_template").innerHTML.toString();
    let replacedHTML = html.replace(/{[A-Z0-9]+}/g, function(type, position, source) {
        switch(type) {
            case "{NV}": // number of visits
            return Math.floor(Math.random() * (gTopicsConsts.clicksIntercept + gTopicsConsts.clicksMultiplier * info.replies));

            case "{NR}": // number of replies
            return info.replies;

            case "{TITLE}":
            return info.title;

            case "{LINKTO}":
            return getPostLink(info.number);

            case "{FLAG}": // labels
            return getTopicLabels(info.labels);

            case "{POSTER}":
            return info.author;

            case "{POSTERURL}":
            return info.authorURL;

            case "{LASTREPLYTIME}":
            return formatTimeTopic(info.lastReplyTime);

            case "{LASTREPLY}":
            return info.lastReplyUser;

            case "{LASTREPLYURL}":
            return info.lastReplyUserURL;

            case "{ADVANCED}":
            return "";

            default:
            return gTopicsConsts.DATA_EXPUNGED;
        }
    });
    return replacedHTML;
}

function addTopic(info) {
    let elem = $C("div");
    elem.className = "topic-item";
    elem.innerHTML = getTopicHTML(info);
    $I("post_insert_here").appendChild(elem);
}

function clearTopicContainer() {
    while($I("post_insert_here").firstChild) {
        $I("post_insert_here").removeChild($I("post_insert_here").firstChild);
    }
}

function updateMetadataTopics() {
    $Q("#all_topic_count").textContent = gTopicsData.topicCount;
    $Q("#all_post_count").textContent = gTopicsData.postCount;
    $Q(".topic_page_cur").textContent = gTopicsData.page + 1;
    $Q(".topic_page_first").style.display = gTopicsData.page != 0 ? "block" : "none";
    $Q(".topic_page_next").style.display = gTopicsData.hasNextPage ? "block" : "none";
    $Q(".topic_page_prev").style.display = gTopicsData.hasPreviousPage ? "block" : "none";
    $Q("#topic_pages").style.display = (gTopicsData.hasPreviousPage || gTopicsData.hasNextPage) ? "block" : "none";
    $A(".member_num").forEach(item => item.textContent = gTopicsData.starCount);

    $A(".bar_name_text").forEach(item => item.textContent = getBarName());
    $A(".bar_name_input").forEach(item => item.value = getBarName());
    $A(".member_name").forEach(item => item.textContent = MEMBER_NAME);
    document.title = getBarName() + "\u5427_\u8D34\u5427";
}

function updateMetadataUser() {
    $Q("#balv_mod").style.display = gUserData.loggedIn ? "block" : "none";
    $Q("#com_userbar").style.display = gUserData.loggedIn ? "block" : "none";
    $Q("#com_userbar_unloggedin").style.display = !gUserData.loggedIn ? "block" : "none";
    $Q(".editor_users").style.display = gUserData.loggedIn ? "block" : "none";
    $Q(".editor_users_unloggedin").style.display = !gUserData.loggedIn ? "block" : "none";
    if(gUserData.loggedIn) {
        $A(".username_display").forEach(item => item.textContent = gUserData.login);
        $A(".username_value").forEach(item => item.value = gUserData.login);
        $A(".user_ava").forEach(item => item.src = gUserData.avatarUrl);
    }
}

function attachLoginMechanism() { // must be a link!! not a button or something
    const githubLoginURL = getGithubLoginURL();
    $A(".login_here").forEach(item => {
        item.href = githubLoginURL;
        item.target = "_self";
    });
}

function saveUserData() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        accessToken: gUserData.accessToken,
        login: gUserData.login,
        nodeID: gUserData.nodeID,
        avatarUrl: gUserData.avatarUrl,
        loggedIn: gUserData.loggedIn
    }));
}

/* returns promise */
function loadUserData() {
    const searchParams = parseSearchParams();
    if(searchParams.access_token) {
        return loginUsingToken(searchParams.access_token);
    }
    else {
        const storedUserJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if(storedUserJSON) {
            const storedUser = JSON.parse(storedUserJSON);
            gUserData.accessToken = storedUser.accessToken;
            gUserData.login = storedUser.login;
            gUserData.nodeID = storedUser.nodeID;
            gUserData.avatarUrl = storedUser.avatarUrl;
            gUserData.loggedIn = storedUser.loggedIn;
            gUserData.score = loadScore();
            return Promise.resolve(gUserData.loggedIn);
        }
        return Promise.resolve(false);
    }
}

function loginUsingToken(token) {
    return fetch(githubUserLoginAPI, {
        headers: {
            Authorization: 'token ' + token
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.message) {
            gUserData.loggedIn = false;
            console.error(message);
            return false;
        }
        gUserData.loggedIn = true;
        gUserData.login = res.name;
        gUserData.nodeID = res.node_id;
        gUserData.avatarUrl = res.avatar_url;
        gUserData.accessToken = token;
        gUserData.score = loadScore();
        saveUserData();
        return true;
    });
}

function getRepoReference() {
    const params = parseSearchParams();

    // repository
    if(params.kw) {
        let group = params.kw.toString().split("/");
        if(group.length == 2) {
            gRepo.owner = group[0];
            gRepo.name = group[1];
            gRepo.bar = params.kw;
        }
    }
}

function processAllTopics(res) {
    if(!res || res.errors || !res.data) {
        console.log("error");
        return;
    }
    let data = res.data.repository.issues;
    gTopicsData.topicCount = data.totalCount;

    // if it cannot retrieve the user
    const ANONYMOUS_USER = {
        login: ANONYMOUS,
        url: ANONYMOUS_URL
    };

    // Estimate the total post count using linear regression
    gTopicsData.postCount = Math.ceil(data.nodes.map(node => node.comments.totalCount+1).reduce((t,a) => t+a, 0) / data.nodes.length * data.totalCount);
    if(!isFinite(gTopicsData.postCount)) {
        gTopicsData.postCount = 0;
    }

    // requested for a repo ID
    if(res.data.repository.id) {
        gRepo.id = res.data.repository.id;
    }

    gTopicsData.maxPages = Math.ceil(data.totalCount / gTopicsConsts.pageTopicCount);
    gTopicsData.cursor = data.pageInfo.startCursor;
    gTopicsData.hasPreviousPage = data.pageInfo.hasPreviousPage;
    gTopicsData.hasNextPage = data.pageInfo.hasNextPage;
    gTopicsData.nextCursor = data.pageInfo.endCursor;
    gTopicsData.starCount = res.data.repository.stargazers.totalCount;
    let issueItems = data.nodes.map(node => ({
        replies: node.comments.totalCount,
        title: node.title,
        number: node.number,
        labels: node.labels,
        author: !node.author ? ANONYMOUS : node.author.login,
        authorURL: !node.author ? ANONYMOUS_URL : node.author.url,
        lastReplyTime: node.comments.nodes.length != 0 ? node.comments.nodes[0].publishedAt : node.createdAt,
        lastReplyUser: ((node.comments.nodes.length != 0 ? node.comments.nodes[0].author : node.author) || ANONYMOUS_USER).login,
        lastReplyUserURL: ((node.comments.nodes.length != 0 ? node.comments.nodes[0].author : node.author) || ANONYMOUS_USER).url
    }))
    updateMetadataTopics();

    clearTopicContainer();
    for(let item of issueItems) {
        addTopic(item);
    }
}

function attachPaginationEvent() {
    $A(".topic_page_next").forEach(item => item.addEventListener("click", evt => {
        gTopicsData.prevCursors[0] = "";
        gTopicsData.prevCursors[gTopicsData.page + 1] = gTopicsData.nextCursor;
        getAndRenderTopicList(gTopicsData.page + 1, gTopicsData.nextCursor);
    }));
    $A(".topic_page_prev").forEach(item => item.addEventListener("click", evt => {
        getAndRenderTopicList(gTopicsData.page - 1, gTopicsData.prevCursors[gTopicsData.page - 1]);
    }));
    $A(".topic_page_first").forEach(item => item.addEventListener("click", evt => {
        getAndRenderTopicList(0, "");
    }));
}

function sanitize(str) {
    return str.replace(/[^a-zA-Z0-9\-_\+=\/]/g, "");
}

function getAndRenderTopicList(currentPage, cursor) {
    gTopicsData.page = isFinite(currentPage) ? currentPage : gTopicsData.page;
    gTopicsData.cursor = typeof cursor == "string" ? cursor : gTopicsData.cursor;
    const cursorOrNot = gTopicsData.cursor ? ", after: \"" + sanitize(gTopicsData.cursor) + "\"" : "";
    const pageTopicCount = gTopicsConsts.pageTopicCount;
    const qlGetAllIssues = `
        query FindIssues {
          repository(owner:"${gRepo.owner}", name:"${gRepo.name}") {
            id,
            forkCount,
            stargazers {
              totalCount
            },
            issues(first: ${pageTopicCount}, states:[OPEN], orderBy: {
              field: UPDATED_AT,
              direction: DESC
            }${cursorOrNot}) {
              totalCount,
              pageInfo {
                endCursor,
                startCursor,
                hasNextPage,
                hasPreviousPage
              },
              nodes {
                author {
                  login,
                  url
                },
                number,
                title,
                body,
                labels(first:10) {
                  nodes {
                    name
                  }
                },
                createdAt,
                comments(last:1) {
                  totalCount,
                  nodes {
                    publishedAt,
                    author {
                        login,
                        url
                    }
                  }
                }
              }
            }
          }
        }
    `;

    githubQL(qlGetAllIssues, null, true).then(res => {
        processAllTopics(res);
    });
}

/* returns promise */
function submitNewTopic(title, content) {
    const qlAddIssue = `
        mutation createIssue($input: CreateIssueInput!) {
          createIssue(input: $input) {
            clientMutationId,
            issue {
              author {
                login
              },
              body,
              number
            }
          }
        }
    `;

    const varsAddIssue = {
        "input": {
            "title" : title,
            "body" : content,
            "repositoryId" : gRepo.id
        }
    };

    return githubQL(qlAddIssue, varsAddIssue, true).then(res => {
        if(res && res.errors) {
            return false;
        }
        if(res && res.data && res.data.createIssue && res.data.createIssue.issue) {
            updateScore(SCORE_DELTA_TOPIC);
            return res.data.createIssue.issue;
        }
        return false;
    });
}

function attachNewTopicEvent() {
    $Q(".subbtn_bg").addEventListener("click", evt => {
        if($Q("#create_topic_title").value == "") {
            return;
        }

        // If user is not logged in, redirect to login page
        if(!gUserData.loggedIn) {
            $Q(".login_here").click();
            return;
        }

        $Q(".subbtn_bg").disabled = true;
        submitNewTopic($Q("#create_topic_title").value, $Q("#create_topic_content").value).then(result => {
            $Q(".subbtn_bg").disabled = false;
            if(result) {
                $Q("#create_topic_title").value = "";
                $Q("#create_topic_content").value = "";
                getAndRenderTopicList(0, "");
            }
        }).catch(error => {
            console.log(error);
            $Q(".subbtn_bg").disabled = false;
        });
    })
}

function attachSearchEvent() {
    const searchEvent = evt => {
        const searchString = $Q(".tb_header_search_input").value.toString().trim();
        let group = searchString.toString().split("/");
        if(group.length == 2) {
            gRepo.owner = group[0];
            gRepo.name = group[1];
            gRepo.bar = searchString;
            goBackToTopicList();
        }
    };
    $Q("#search_submit").addEventListener("click", searchEvent);
    $Q(".tb_header_search_input").addEventListener("keydown", evt => {
        if(evt.key == "Enter") {
            searchEvent(evt);
            evt.stopPropagation();
            evt.preventDefault();
        }
    });
}

function init() {
    attachPaginationEvent();
    attachNewTopicEvent();
    attachSearchEvent();
    loadUserData().then(res => {
        getRepoReference();
        getAndRenderTopicList(0, "");
        updateMetadataUser();
        updateScore();
        attachLoginMechanism();
    })
    generateEmotions("#emoticonBar1", "#create_topic_content");
}

window.addEventListener("load", evt => {
    init();
})








