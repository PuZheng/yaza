#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
from datetime import datetime
from setuptools import Command

from werkzeug.security import generate_password_hash

__import__('genuine_ap.basemain')
from genuine_ap.models import (SPU, SKU, Vendor, Group, User, Comment,
                               Favor, Retailer, SPUType)
from genuine_ap.utils import do_commit
from genuine_ap import const


class InitializeTestDB(Command):
    def initialize_options(self):
        """init options"""
        pass

    def finalize_options(self):
        """finalize options"""
        pass

    def run(self):
        from genuine_ap.tools import build_db
        build_db.build_db()
        vendor_group = Group.query.get(const.VENDOR_GROUP)
        retailer_group = Group.query.get(const.RETAILER_GROUP)
        customer_group = Group.query.get(const.CUSTOMER_GROUP)
        # users
        customer1 = do_commit(User(name=u'liubei',
                                   password=generate_password_hash(
                                       'liubei', 'pbkdf2:sha256'),
                                   group=customer_group))
        customer2 = do_commit(User(name=u'guanyu',
                                   password=generate_password_hash(
                                       'guanyu', 'pbkdf2:sha256'),
                                   group=customer_group))
        customer3 = do_commit(User(name=u'zhangfei',
                                   password=generate_password_hash(
                                       'guanyu', 'pbkdf2:sha256'),
                                   group=customer_group))
        motai_admin = do_commit(User(group=vendor_group, name=u'maotai',
                                     password=generate_password_hash(
                                         'maotai', 'pbkdf2:sha256')))
        hongta_admin = do_commit(User(group=vendor_group, name=u'hongta',
                                      password=generate_password_hash(
                                          'hongta', 'pbkdf2:sha256')))
        user_a = do_commit(User(group=retailer_group, name=u'a',
                                password=generate_password_hash(
                                    'a', 'pbkdf2:sha256')))
        user_b = do_commit(User(group=retailer_group, name=u'b',
                                password=generate_password_hash(
                                    'b', 'pbkdf2:sha256')))
        # vendors
        brief = u'''
        贵州茅台酒股份有限公司是由中国贵州茅台酒厂有限责任公司、贵州茅台酒厂技术开发公司、贵州省轻纺集体工业联社、深圳清华大学研究院、中国食品发酵工业研究所、北京糖业烟酒公司、江苏省糖烟酒总公司、上海捷强烟草糖酒（集团）有限公司等八家公司共同发起，并经过贵州省人民政府黔府函字（1999）291号文件批准设立的股份有限公司，注册资本为一亿八千五百万元。
        '''
        vendor1 = do_commit(Vendor(name=u'贵州茅台酒厂有限公司',
                                   telephone="0571-00000000",
                                   address=u'贵州芜湖市天堂区1122路',
                                   email='support@motai.com',
                                   website='http://www.motail.com',
                                   brief=brief, administrator=motai_admin))
        brief = u"""
红塔烟草（集团）有限责任公司，创业于1956年，从一个小规模的烟叶复烤厂到名列中国第一，世界前列的现代化跨国烟草企业集团，红塔集团的发展史，就是一部中国民族工业不断求新图变追赶世界先进水平的演进史。
在“山高人为峰”的企业精神指引下，红塔集团坚持“以主业为主，提质创新，增强企业核心竞争力”的工作思路，以消费者为导向，以科技创新带动产品品质不断提高，其主要品牌红塔山连续七年蝉联中国最有价值品牌第一名，红塔山、玉溪、恭贺新禧、阿诗玛、红梅在中国烟草行业36个名优品牌中占有五席，并与国宾、美登、人民大会堂等一起入选国家烟草专卖局全国卷烟百牌号行列，在国内外享有盛誉，有的出口国际市场，为海外消费者提供了环保、自然、健康、醇和的高品质烟草产品。红塔山品牌在世界品牌价值实验室（World Brand Value Lab）编制的2010年度《中国品牌500强》排行榜中排名第53位，品牌价值已达121.33亿元。
除致力于做精、做强、做大烟草主业之外，红塔集团还成功涉足能源交通、金融保险、医药以及轻化工行业，独资、控股、参股69家企业，累计对外投资达147.9亿元人民币。
红塔山
红塔山(11张)
1999年-2009年，红塔集团加快了在行业内整合重组的步伐，坚持并实践着“大企业、大市场、大品牌”的整合发展思路―――
1999年2月，兼并长春卷烟厂，实现了中国烟草业首例跨省兼并的资本运作。
2003年5月，控股红塔海南卷烟有限责任公司。
2003年12月，成立红塔辽宁烟草有限责任公司。
2004年9月，实现与楚雄卷烟厂、大理卷烟厂产供销、人财物的一体化整合...
2008年11月8日 红塔集团重组红河集团昭通卷烟厂
2009年1月1日开始，昭通卷烟厂正式生产红塔集团“红塔山”、“红梅”两个品牌卷烟。
九层之台起于垒土
千里之行始于足下
科技创造价值，价值回报社会，这是红塔集团始终坚持的企业发展之路。今天，红塔集团面对着无数可能的竞争选择和瞬息万变的市场风云，我们坚信，唯有站得更高，才能看得更远，唯有时刻胸怀社会，积极进取，才能在全新的信息时代获得更大的发展。
        """
        vendor2 = do_commit(Vendor(name=u'红塔山集团',
                                   telephone="0571-11111111",
                                   email='support@hongta.com',
                                   address=u'贵州芜湖市天堂区1122路',
                                   website='http://hongta.com',
                                   brief=brief[:256],
                                   administrator=hongta_admin))
        # spu types
        spu_type1 = do_commit(SPUType(name=u'香烟',
                                      pic_path='static/spu_type_pics/1.jpg'))
        spu_type2 = do_commit(SPUType(name=u'国产白酒', weight=1,
                                      pic_path='static/spu_type_pics/2.jpg'))
        # spus
        spu1 = do_commit(SPU(name=u'飞天茅台53度', code='854013',
                             vendor=vendor1, msrp=1300, spu_type=spu_type2,
                             rating=4.0))
        spu2 = do_commit(SPU(name=u'红塔山(大经典)', code='987360',
                             vendor=vendor2, msrp=50, spu_type=spu_type1,
                             rating=4.0))
        do_commit(SPU(name=u'茅台迎宾酒', code='582677',
                      vendor=vendor1, msrp=100, spu_type=spu_type2,
                      rating=3.0))
        # skus
        sku1 = do_commit(SKU(spu=spu1,
                             manufacture_date=datetime.strptime('2010-11-11',
                                                                '%Y-%m-%d'),
                             expire_date=datetime.strptime('2020-11-11',
                                                           '%Y-%m-%d'),
                             token='000001', checksum='111111'))
        sku2 = do_commit(SKU(spu=spu1,
                             manufacture_date=datetime.strptime('2011-12-12',
                                                                '%Y-%m-%d'),
                             expire_date=datetime.strptime('2021-12-12',
                                                           '%Y-%m-%d'),
                             token='000002', checksum='2222222'))
        sku3 = do_commit(SKU(spu=spu2,
                             manufacture_date=datetime.strptime('2010-11-11',
                                                                '%Y-%m-%d'),
                             expire_date=datetime.strptime('2011-11-11',
                                                           '%Y-%m-%d'),
                             token='000003', checksum='3333333'))
        sku4 = do_commit(SKU(spu=spu2,
                             manufacture_date=datetime.strptime('2011-12-12',
                                                                '%Y-%m-%d'),
                             expire_date=datetime.strptime('2012-12-12',
                                                           '%Y-%m-%d'),
                             token='000004', checksum='44444444'))
        # comments
        do_commit(Comment(content=u'好酒!', spu=spu1, user=customer1, rating=4.0))
        do_commit(Comment(content=u'好酒!!', spu=spu1, user=customer2, rating=4.5))
        do_commit(Comment(content=u'好酒!!!', spu=spu1, user=customer3, rating=5.0))
        do_commit(Comment(content=u'烂烟~', spu=spu2, user=customer1, rating=3.0))
        do_commit(Comment(content=u'烂烟~~', spu=spu2, user=customer2, rating=2.5))
        do_commit(Comment(content=u'烂烟~~~', spu=spu2, user=customer3, rating=2.0))
        # favors
        do_commit(Favor(spu=spu1, user=customer1))
        do_commit(Favor(spu=spu1, user=customer2))
        do_commit(Favor(spu=spu1, user=customer3))
        do_commit(Favor(spu=spu2, user=customer1))
        # retailers
        do_commit(Retailer(name=u'A烟酒专卖', rating=4.0, longitude=1.0,
                           latitude=1.0, address=u'杭州市西湖区申花路789号',
                           spu_list=[spu1, spu2], administrator=user_a))
        do_commit(Retailer(name=u'B烟酒专卖', rating=4.5, longitude=1.0,
                           latitude=1.0, address=u'杭州市西湖区古墩路83号',
                           spu_list=[spu2], administrator=user_b))


if __name__ == "__main__":
    from distutils.dist import Distribution
    InitializeTestDB(Distribution()).run()
