# 概述

用户定制完毕后， 将定制结果提交到后台， 管理员可以下载定制结果。 隐藏的对象是不作为定制结果的

# 浏览器支持

ie9+, firefox, chrome

# 检查清单
* 不做出任何定制，提交定制结果， 是否出现“请先定制”的提示.
* 做出定制后， 隐藏所有的对象， 点击提交定制结果， 查看是否出现“请先定制”的提示。
* 做出定制， 提交到后台， 查看是否出现提交的定制结果。包含如下信息:
*   * 定制结果中包含的图像文字对象的位置，大小，旋转是否正确。
*   * 若定制页面的url由管理员生成， 那么后台的定制结果中应当包含的订单号。结合[us11.管理员生成用户定制链接](us11.管理员生成用户定制链接)
*   * 提交时间
* 针对一个有多面， 多定制区的衣服， 在每个定制区做出定制(至少包含文字，图片两种素材，图片包括用户上传和系统自带两种)， 下载后， 查看位置，旋转，大小等是否正确。尤其是图片比例是否和原图一致， 并且PPI是否达到指定值。参考[系统配置项说明](index.html#系统配置项说明.md)
* 隐藏某个对象， 提交， 隐藏的对象不应该包含在定制结果中.
