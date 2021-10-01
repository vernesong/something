/*
[Script]
groupPanel = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/fishingworld/something/main/grouppanel.js,argument=icon=network&color=#86abee&group=Master
  对应参数：
	icon：图标
	color：图标颜色
	group：策略组名称
[Panel]
groupPanel = script-name=groupPanel,update-interval=-1
*/



;(async () => {

let params = getParams($argument);
let group = params.group;
let proxy = await httpAPI("/v1/policy_groups");

var proxyName= [];

let arr = proxy[""+group+""];

for (let i = 0; i < arr.length; ++i) {
proxyName.push(arr[i].name);

}

let index =Number($persistentStore.read([group]));

let body = {"group_name": group, "policy": proxyName[index]}
let name =proxyName[index];
let rootName;
if(arr[index].isGroup==true){
	rootName = (await httpAPI("/v1/policy_groups/select?group_name="+name+"")).policy;
	name=name + ' ➟ ' + rootName;
}



index += 1;

if(index>arr.length-1){
	index = 0;
}

$persistentStore.write(""+index+"", [group])

await httpAPI("/v1/policy_groups/select","POST",body);
    $done({
      title:group,
      content:name,
      icon: params.icon,
		  "icon-color":params.color
    });
})();


function httpAPI(path = "", method = "GET", body = null) {
    return new Promise((resolve) => {
        $httpAPI(method, path, body, (result) => {

            resolve(result);
        });
    });
};

function getParams(param) {
  return Object.fromEntries(
    $argument
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}
