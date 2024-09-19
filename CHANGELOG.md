## v1.0

### Breaking changes

* 默认counter和在项目启动时绑定到sharedb

* edit接口可以额外绑定多个组件

### Features

组件绑定接口
参数 doc_ids(array) taskset_id(int)
http://localhost:8080/api/edit
api/edit
参数异常 return res.status(200).json({cd:1,msg:'参数异常'})
绑定成功 return res.status(200).json({cd:0,msg:'操作成功',data:taskset})
绑定失败 return res.status(500).json({cd:1,msg:'操作失败'})

ws服务
http://localhost:3000/
监听editor和的change事件，将json1类型数据同步到sharedb

### demo

/server.js
/client.js
/static/index.html

