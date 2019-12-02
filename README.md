## Postbar

2012版的〇度贴吧，通过github API实现serverless运作

### 主要功能

- 缅怀过往
- 借古讽今
- 把发issues的过程换成水贴，实现高效绿化github主页
- 然而并没有什么卵用
- 其实是我实在找不到什么好玩的游戏了，都无聊成这样了，不如还是再去开一把EU4吧

### 实现方法

- 通过Github OAuth登陆
- 用这个repo的issues进行发贴
- 用Github GraphQL API获得相关贴子和回复
- 甚至可以实现加精置顶，虽然我还没实现置顶的功能

### 安装流程

- 在Github选项里进入最后一项（Developer settings）
- 注册一个OAuth App和一个personal access token（什么权限也不用点）
- 在issues里面加一条红色的标签，名为digest
- 用[graphQL explorer](https://developer.github.com/v4/explorer/)跑一下下面这个查询，会给出repo ID和label ID （当然owner和name填你的）

```text
query {
  repository(owner:"kotritrona", name:"postbar") {
    forkCount,
    id,
    stargazers {
      totalCount
    },
    label(name:"digest") {
      name,
      id
    }
  }
}
```

- 在base.js最前面把相关的变量改成你的
- 发布到github pages

### todo:

简单改个手机版的css出来，方便在手机上水贴
像discourse那样排版就好了