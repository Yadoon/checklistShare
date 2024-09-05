## v1.0

### Breaking changes

* 默认editor1和editor2在项目启动时绑定到sharedb

* 触发button创建或编辑文档事件后将editor3绑定到sharedb

需要协同服务时可以连接到ws://localhost:3000/,然后在button点击事件中调用createDoc()方法http://localhost:8080/api/edit

http://localhost:8080/api/edit post body: {"doc_id"(string):"前端组件组件框名","taskset_id"(int):"待编辑的清单id"}

如果协同服务中尚未创建对应组件以及相关数据,会返回mysql中的完整taskset数据,并创建绑定组件,客户端需要将数据填充到组件中

cd===0说明是正常的返回
判断返回是否使用了mysql中的数据 flag = result.cd === 0 && result.data && result.data[0].id === taskset_id
flag为true说明使用了mysql数据,否则使用了sharedb中的数据

cd===1说明是错误的返回
传入的参数不合法或有异常

