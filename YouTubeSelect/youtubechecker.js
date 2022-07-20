/* 脚本经本人测试已经可以正常运行，但仍可能存在bug，使用过程中遇到障碍请联系Telegram：https://t.me/okmytg
脚本说明：https://github.com/fishingworld/something/blob/main/NetflixSelect/README.md
*/


  ; (async () => {

    //测试当前状态
    let { status, regionCode } = await testPolicy();
    let newStatus = status
    let reg = regionCode
    if (status < 0) {
      console.log("连接失败了，再测一次")
      await timeout(1000).catch(() => { })
      let { status, regionCode } = await testPolicy();
      newStatus = status
      reg = regionCode
    }
    if (newStatus === 2) {
      console.log("当前节点仍可用 退出检测")
    } else {


      let youtubeGroup = $persistentStore.read("YTGroupName")
      let proxy = await httpAPI("/v1/policy_groups");
      let groupName = (await httpAPI("/v1/policy_groups/select?group_name=" + encodeURIComponent(youtubeGroup) + "")).policy;

      let allGroup = [];
      for (var key in proxy) {
        allGroup.push(key)
      }
      var data
      if ($persistentStore.read("YTREGIONCODE") == null) {
        data = {}
      } else {
        data = JSON.parse($persistentStore.read("YTREGIONCODE"))
      }

      let dataname;
      var ytfullUnlock = [];
      var ytnosupport = [];
      var selectFU = []
      var selectNO = []


      if ($persistentStore.read("YTFULLUNLOCK") == null || $persistentStore.read("YTNOSUPPORT") == null) { } else {
        //读取持久化数据
        ytfullUnlock = $persistentStore.read("YTFULLUNLOCK").split(",");
        ytnosupport = $persistentStore.read("YTNOSUPPORT").split(",");
        //清除空值
        del(ytfullUnlock, "")
        del(ytnosupport, "")
      }
      /* 测试当选策略组节点状态并记录数据 */

      var selectName = []
      let select = proxy["" + groupName + ""];
      for (let i = 0; i < select.length; ++i) {
        selectName.push(select[i].name);
      }
      //去除历史数据
      for (let i = 0; i < selectName.length; ++i) {
        if (ytfullUnlock.includes(selectName[i]) == true) {
          del(ytfullUnlock, selectName[i])
        } else if (ytnosupport.includes(selectName[i]) == true) {
          del(ytnosupport, selectName[i])
        }
      }

      //遍历检测当选策略
      console.log("当前检测：" + groupName)
      for (let i = 0; i < selectName.length; ++i) {
        //切换节点
        $surge.setSelectGroupPolicy(groupName, selectName[i]);
        //等待
        await timeout(1000).catch(() => { })
        //执行测试

        let { status, regionCode } = await testPolicy();
        newStatus = status
        reg = regionCode
        /* 检测超时 再测一次 */
        if (status < 0) {
          console.log(selectName[i] + ": 连接失败了，再测一次")
          await timeout(1000).catch(() => { })
          let { status, regionCode } = await testPolicy();
          newStatus = status
          reg = regionCode
        }
        console.log("检测结果：" + selectName[i] + " | " + statusName(newStatus))
        //填充数据
        dataname = selectName[i]
        data[dataname] = reg
        if (newStatus === 1) {
          if (ytfullUnlock.includes(selectName[i]) == false) {
            ytfullUnlock.push(selectName[i])
            selectFU.push(selectName[i])
          }
        } else {
          if (ytnosupport.includes(selectName[i]) == false) {
            ytnosupport.push(selectName[i])
            selectNO.push(selectName[i])
          }
        }
        //找到全解锁节点 退出检测
        if (newStatus == 1) {
          console.log("找到可用节点 退出检测")
          break;
        }
      }

      /* 择优选择节点 */
      //设定选择列表
      var selectList = []

      console.log(selectFU.length + " | " + selectNO.length)

      if (selectFU.length > 0) {
        selectList = selectFU
      } else if (selectFU.length == 0 && selectNO.length > 0) {
        selectList = selectNO
      }

      console.log("选择列表:" + selectList.sort())
      //切换节点
      if (selectList.length > 0) $surge.setSelectGroupPolicy(groupName, selectList[0]);


      // 创建持久化数据

      $persistentStore.write(ytfullUnlock.toString(), "YTFULLUNLOCK");
      $persistentStore.write(ytnosupport.toString(), "YTNOSUPPORT")
      $persistentStore.write(JSON.stringify(data), "YTREGIONCODE")

      //打印测试结果
      console.log("全解锁:" + ytfullUnlock.sort())
      console.log("未解锁:" + ytnosupport.sort())
      
      /* 刷新信息 */
      //获取根节点名
      let rootName = (await httpAPI("/v1/policy_groups/select?group_name=" + encodeURIComponent(youtubeGroup) + "")).policy;
      while (allGroup.includes(rootName) == true) {
        rootName = (await httpAPI("/v1/policy_groups/select?group_name=" + encodeURIComponent(rootName) + "")).policy;
      }

      /**
      * 面板显示
      */

      let title = "YouTube Premium ➟ " + rootName;

      let panel = {
        title: `${title}`,
      }

      if (ytfullUnlock.includes(rootName)) {
        panel['content'] = `支持 YouTube Premium  地区：${data[rootName]}`
        panel['icon'] = params.icon1
        panel['icon-color'] = params.color1
      } else if (ytnosupport.includes(rootName)) {
        panel['content'] = `不支持 YouTube Premium`
        panel['icon'] = params.icon2
        panel['icon-color'] = params.color2
      } else {
        console.log("test")
        panel['content'] = `没有找到可用的节点`
        panel['icon'] = params.icon3
        panel['icon-color'] = params.color3
      }
    }

    $done(panel)

  })();

function httpAPI(path = "", method = "GET", body = null) {
  return new Promise((resolve) => {
    $httpAPI(method, path, body, (result) => {
      resolve(result);
    });
  });
};

async function testPolicy() {
  try {
    const regionCode = await Promise.race([test(), timeout(5000)])
    return { status: 1, regionCode }
  } catch (error) {
    if (error === 'Not Available') {
      return { status: 0 }
    }
    console.log(error)
    return { status: -1 }
  }
}

/**
 * 测试是否解锁
 */
function test() {
  return new Promise((resolve, reject) => {
    let option = {
      url: `https://www.youtube.com/premium`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
        'Accept-Language': 'en',
      },
    }
    $httpClient.get(option, function (error, response, data) {
      if (error != null || response.status !== 200) {
        reject('Error')
        return
      }

      if (data.indexOf('is not available in your country') !== -1) {
        reject('Not Available')
        return
      }

      if (response.status === 200) {
        let region = ''
        let re = new RegExp('"countryCode":"(.*?)"', 'gm')
        let result = re.exec(data)
        if (result != null && result.length === 2) {
          region = result[1]
        } else if (data.indexOf('www.google.cn') !== -1) {
          region = 'CN'
        } else {
          region = 'US'
        }
        resolve(region.toUpperCase())
        return
      }

      reject('Error')
    })
  })
}

function timeout(delay = 5000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('Timeout')
    }, delay)
  })
}

function statusName(status) {
  return status == 1 ? "全解锁"
      : status == 0 ? "未解锁"
        : status == -1 ? "检测失败"
          : "检测超时";
}

function del(arr, num) {
  var l = arr.length;
  for (var i = 0; i < l; i++) {
    if (arr[0] !== num) {
      arr.push(arr[0]);
    }
    arr.shift(arr[0]);
  }
  return arr;
}
