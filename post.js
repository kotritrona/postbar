/*
* @Author: Kotri Lv.199
* @Date:   2019-12-02 15:34:03
* @Last Modified by:   Kotri Lv.192
* @Last Modified time: 2019-12-04 23:02:39
*
* Base Code for Serverless Old Tieba
*/

'use strict';
'use very strict';

/* global constants */
const gPostsConsts = {
    pagePostCount : 30,
    DATA_EXPUNGED : "[\u6570\u636E\u5220\u9664]"
};

const REPLY_PREFIX = "\u56DE\u590D\uFF1A";

/* global variables */
let gPostsData = {
    topicNumber : 1,
    title : "",
    id : "", /* the issue ID */
    isDigest: false,
    page : 0,
    maxPages : 0,
    cursor : "",
    prevCursors : [],
    nextCursor : "",
    hasPreviousPage : false,
    hasNextPage : false,
    postCount : 0,
    replyCount : 0,
    starCount : 0
};

/* Convert date format. */
function formatTimePost(di) {
    var d = new Date(di);
    var o = "";
    o += d.getFullYear() + "-";
    var k = (d.getMonth()+1).toString();
    while(k.length<2) {
        k = "0" + k;
    }
    o += k + "-";
    var k = d.getDate().toString();
    while(k.length<2) {
        k = "0" + k;
    }
    o += k + " ";
    var k = d.getHours().toString();
    while(k.length<2) {
        k = "0" + k;
    }
    o += k + ":";
    var k = d.getMinutes().toString();
    while(k.length<2) {
        k = "0" + k;
    }
    o += k;
    return o;
}

function randString() {
    return Math.floor(Math.random() * 1145141919810000).toString(36).split("").map(k => Math.random() < 0.5 ? k.toUpperCase() : k).join("");
}

/* #post_insert_here */
function getPostHTML(newInfo) {

    // add informations up
    let info = {
        order: 0,
        title: "Hello World!",
        content: "Hello!",
        author: "kotritrona",
        authorURL: "",
        createdAt: new Date(),
        id: ""
    };
    Object.assign(info, newInfo);

    // render html text
    let html = $I("post_template").innerHTML.toString();
    let replacedHTML = html.replace(/{[A-Z0-9]+}/g, function(type, position, source) {
        switch(type) {
            case "{FLOOR}": // order statistic
            return info.order + 1;

            case "{POSTTITLE}":
            return info.title;

            case "{POSTCONTENT}":
            return info.content;

            case "{VALNUM}": // value number unique to floor
            return info.id;

            case "{AUTHOR}":
            return info.author;

            case "{AUTHORURL}":
            return info.authorURL;

            case "{POSTTIME}":
            return formatTimePost(info.createdAt);

            case "{LASTREPLY}":
            return info.lastReplyUser;

            case "{LASTREPLYURL}":
            return info.lastReplyUserURL;

            default:
            return gTopicsConsts.DATA_EXPUNGED;
        }
    });
    return replacedHTML;
}

function addPost(info) {
    let elem = $C("div");
    elem.className = "l_post";
    elem.innerHTML = getPostHTML(info);
    $I("sp2").appendChild(elem);
}

function clearPostContainer() {
    while($I("sp2").firstChild) {
        $I("sp2").removeChild($I("sp2").firstChild);
    }
}

function updateMetadataPosts() {
    $A(".all_post_count").forEach(item => item.textContent = gPostsData.replyCount);

    $A(".post_cur_page").forEach(item => item.textContent = gPostsData.page + 1);
    $A(".post_next_page").forEach(item => item.style.display = gPostsData.hasNextPage ? "inline" : "none");
    $A(".post_prev_page").forEach(item => item.style.display = gPostsData.hasPreviousPage ? "inline" : "none");
    $A(".l_pager").forEach(item => item.style.display = (gPostsData.hasPreviousPage || gPostsData.hasNextPage) ? "inline" : "none");

    $A(".bar_name_text").forEach(item => item.textContent = getBarName());
    $A(".bar_name_input").forEach(item => item.value = getBarName());
    $A(".member_name").forEach(item => item.textContent = MEMBER_NAME);
    document.title = gPostsData.title + "_" + getBarName() + "\u5427_\u8D34\u5427";
}

function updateMetadataUser() {
    $Q("#balv_mod").style.display = gUserData.loggedIn ? "block" : "none";
    $Q("#com_userbar").style.display = gUserData.loggedIn ? "block" : "none";
    $Q("#com_userbar_unloggedin").style.display = !gUserData.loggedIn ? "block" : "none";
    if(gUserData.loggedIn) {
        $A(".username_display").forEach(item => item.textContent = gUserData.login);
        $A(".username_value").forEach(item => item.value = gUserData.login);
        $A(".user_ava").forEach(item => item.src = gUserData.avatarUrl);
    }

    $A(".bar_url").forEach(item => item.href = getBarURL());
}

function showPostsAdBar() {
    $Q("#tb_top_ad").src = "ad/ad" + Math.floor(1 + Math.random() * POST_BANNER_IMAGE_COUNT) + ".png";
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

function processAllPosts(res) {
    if(!res || res.errors || !res.data) {
        console.log("error");
        return;
    }
    let data = res.data.repository.issue;
    gPostsData.replyCount = data.comments.totalCount;
    gPostsData.postCount = data.comments.totalCount+1;

    let pageInfo = data.comments.pageInfo;
    let comments = data.comments.nodes;

    // requested for a repo ID
    if(res.data.repository.id) {
        gRepo.id = res.data.repository.id;
    }

    gPostsData.id = data.id;
    gPostsData.title = data.title;
    gPostsData.maxPages = Math.ceil((1 + data.comments.totalCount) / gPostsConsts.pagePostCount);
    gPostsData.cursor = pageInfo.startCursor;
    gPostsData.hasPreviousPage = pageInfo.hasPreviousPage;
    gPostsData.hasNextPage = pageInfo.hasNextPage;
    gPostsData.nextCursor = pageInfo.endCursor;
    gPostsData.starCount = res.data.repository.stargazers.totalCount;
    gPostsData.isDigest = data.labels.nodes.some(label => label.name == LABEL_DIGEST);

    let postItems = comments.map((node, i) => ({
        title: REPLY_PREFIX + data.title,
        order: i + (gPostsData.page == 0 ? 1 : 0) + gPostsData.page * gPostsConsts.pagePostCount,
        content: node.bodyHTML,
        author: !node.author ? ANONYMOUS : node.author.login,
        authorURL: !node.author ? ANONYMOUS_URL : node.author.url,
        createdAt: node.createdAt,
        url: node.url,
        id: node.id
    }));

    if(gPostsData.page == 0) {
        postItems.unshift({
            title: data.title,
            order: 0,
            content: data.bodyHTML,
            author: !data.author ? ANONYMOUS : data.author.login,
            authorURL: !data.author ? ANONYMOUS_URL : data.author.url,
            createdAt: data.createdAt,
            url: data.url,
            id: data.id
        });
    }
    updateMetadataPosts();

    clearPostContainer();
    for(let item of postItems) {
        addPost(item);
    }
}

function attachPaginationEvent() {
    $A(".post_next_page").forEach(item => item.addEventListener("click", evt => {
        gPostsData.prevCursors[0] = "";
        gPostsData.prevCursors[gPostsData.page + 1] = gPostsData.nextCursor;
        getAndRenderPostList(gPostsData.page + 1, gPostsData.nextCursor);
    }));
    $A(".post_prev_page").forEach(item => item.addEventListener("click", evt => {
        getAndRenderPostList(gPostsData.page - 1, gPostsData.prevCursors[gPostsData.page - 1]);
    }));
}

function getTopicReference() {
    const params = parseSearchParams();
    if(!params.kz) {
        location.replace(getBarURL());
        return;
    }
    gPostsData.topicNumber = params.kz;

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

function getBarURL() {
    if(gRepo.owner == DEFAULT_REPO_OWNER && gRepo.name == DEFAULT_REPO_NAME) {
        return BAR_FILE;
    }
    else {
        let kw = encodeURIComponent(gRepo.owner + "/" + gRepo.name);
        return BAR_FILE + `?kw=${kw}`;
    }
}

function getBarName() {
    return gRepo.bar;
}

function sanitize(str) {
    return str.replace(/[^a-zA-Z0-9\-_\+=\/]/g, "");
}

function getAndRenderPostList(currentPage, cursor) {
    gPostsData.page = isFinite(currentPage) ? currentPage : gPostsData.page;
    gPostsData.cursor = typeof cursor == "string" ? cursor : gPostsData.cursor;
    const cursorOrNot = gPostsData.cursor ? ", after: \"" + sanitize(gPostsData.cursor) + "\"" : "";
    const pagePostCount = gPostsConsts.pagePostCount + (currentPage == 0 ? -1 : 0);
    const qlGetAllIssueComments = `
        query FindIssueComments {
          repository(owner:"${gRepo.owner}", name:"${gRepo.name}") {
            id,
            forkCount,
            stargazers {
              totalCount
            },
            label(name:"${LABEL_DIGEST}") {
              id
            },
            issue(number: ${gPostsData.topicNumber}) {
              author {
                login,
                url
              },
              number,
              title,
              id,
              bodyHTML,
              createdAt,
              databaseId,
              url,
              labels(first: 10) {
                nodes {
                  name
                }
              }
              comments(first: ${pagePostCount}${cursorOrNot}) {
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
                  databaseId,
                  bodyHTML,
                  createdAt,
                  id,
                  url
                }
              }
            }
          }
        }
    `;

    githubQL(qlGetAllIssueComments, null, true).then(res => {
        processAllPosts(res);
    });
}

function submitNewReply(content) {
    const qlAddReply = `
        mutation addComment($input: AddCommentInput!) {
          addComment(input: $input) {
            clientMutationId,
            commentEdge {
              node {
                author {
                  login
                },
                body
              }
            }
          }
        }
    `;

    const varsAddReply = {
        "input": {
            "body" : content,
            "subjectId" : gPostsData.id
        }
    };

    return githubQL(qlAddReply, varsAddReply, true).then(res => {
        if(res && res.errors) {
            return false;
        }
        if(res && res.data && res.data.addComment && res.data.addComment.commentEdge && res.data.addComment.commentEdge.node) {
            updateScore(SCORE_DELTA_REPLY);
            return res.data.addComment.commentEdge.node;
        }
        return false;
    });
}

function attachNewReplyEvent() {
    $Q(".subbtn_bg").addEventListener("click", evt => {
        if($Q("#textInput").value == "") {
            return;
        }

        // If user is not logged in, redirect to login page
        if(!gUserData.loggedIn) {
            $Q(".login_here").click();
            return;
        }

        $Q(".subbtn_bg").disabled = true;
        submitNewReply($Q("#textInput").value).then(result => {
            $Q(".subbtn_bg").disabled = false;
            if(result) {
                $Q("#textInput").value = "";
                getAndRenderPostList(0, "");
            }
        }).catch(error => {
            console.log(error);
            $Q(".subbtn_bg").disabled = false;
        });
    })
}


function submitDeleteComment(id) {
    const qlDeleteComment = `
        mutation deleteComment($input: DeleteIssueCommentInput!) {
          deleteIssueComment(input: $input) {
            clientMutationId
          }
        }
    `;


    const varsDeleteComment = {
        "input": {
            "id" : id,
            "clientMutationId" : "deleteComment_" + randString()
        }
    };

    return githubQL(qlDeleteComment, varsDeleteComment, true).then(res => {
        if(res && res.errors) {
            return false;
        }
        if(res && res.data && res.data.deleteIssueComment && res.data.deleteIssueComment.clientMutationId) {
            return res.data.deleteIssueComment.clientMutationId;
        }
        return false;
    });
}

function goBackToTopicList() {
    location.replace(getBarURL());
}

function evtDeletePost(commentID, floorCount) {
    if(floorCount == 1) {
        submitDeleteIssue(commentID).then(result => {
            if(result) {
                goBackToTopicList();
            }
        }).catch(error => {
            console.log(error);
        });
        return;
    }

    submitDeleteComment(commentID).then(result => {
        if(result) {
            getAndRenderPostList(0, "");
        }
    }).catch(error => {
        console.log(error);
    });
}

function submitDeleteIssue(id) {
    const qlDeleteIssue = `
        mutation deleteIssue($input: DeleteIssueInput!) {
          deleteIssue(input: $input) {
            clientMutationId
          }
        }
    `;

    const varsDeleteIssue = {
        "input": {
            "issueId" : id,
            "clientMutationId" : "deleteIssue_" + randString()
        }
    };

    return githubQL(qlDeleteIssue, varsDeleteIssue, true).then(res => {
        if(res && res.errors) {
            return false;
        }
        if(res && res.data && res.data.deleteIssue && res.data.deleteIssue.clientMutationId) {
            return res.data.deleteIssue.clientMutationId;
        }
        return false;
    });
}

function attachDeleteIssueEvent() {
    $Q("#hide_topic_link").addEventListener("click", evt => {
        submitDeleteIssue(gPostsData.id).then(result => {
            if(result) {
                goBackToTopicList();
            }
        }).catch(error => {
            console.log(error);
        });
    })
}

function submitUpdateDigest(id, digestStatus) {
    const ql = `
        mutation UpdateIssue($input: UpdateIssueInput!) {
          updateIssue(input: $input) {
            clientMutationId
          }
        }
    `;

    const vars = {
        "input": {
            "id" : id,
            "labelIds" : digestStatus ? [DIGEST_LABEL_ID] : [],
            "clientMutationId" : "updateIssue_" + randString()
        }
    };

    return githubQL(ql, vars, true).then(res => {
        if(res && res.errors) {
            return false;
        }
        if(res && res.data && res.data.updateIssue && res.data.updateIssue.clientMutationId) {
            return res.data.updateIssue.clientMutationId;
        }
        return false;
    });
}

function attachDigestEvent() {
    $Q("#add_digest_topic").addEventListener("click", evt => {
        submitUpdateDigest(gPostsData.id, !gPostsData.isDigest).then(result => {
            if(result) {
                getAndRenderPostList(0, "");
            }
        }).catch(error => {
            console.log(error);
        });
    })
}

function evtReplyTo(flo, author) {
    var cont = $I("textInput").value;
    if(cont.match(/^\u56DE\u590D [^:\(\)]* \([0-9]+\u697C\): \r?\n/i))
    {
        cont = cont.replace(/^\u56DE\u590D [^:\(\)]* \([0-9]+\u697C\): \r?\n/i,"");
    }
    if(parseInt(flo) == 1)
    {
        $I("textInput").value = cont;
    }
    else
    {
        $I("textInput").value = "\u56DE\u590D " + author + " (" + flo + "\u697C): \r\n" + cont;
    }
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
    showPostsAdBar();
    loadUserData().then(res => {
        getTopicReference();
        getAndRenderPostList(0, "");

        attachPaginationEvent();
        attachNewReplyEvent();
        attachDigestEvent();
        attachDeleteIssueEvent();
        attachSearchEvent();

        updateMetadataUser();
        updateScore();
        attachLoginMechanism();
    })
    generateEmotions("#emoticonBar2", "#textInput");
}

window.addEventListener("load", evt => {
    init();
})








