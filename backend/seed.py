"""
TradeHub seed data — demo data for testing and demo purposes.
Run: cd backend && python3 seed.py
"""

import sys, os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, datetime, timedelta
from database import engine, Base, SessionLocal
from models import (
    Customer, CustomerContact, Supplier, SupplierQuote,
    FreightForwarder, FreightQuote, Product,
    Quotation, Order, OrderTimeline, Contract,
    AfterSalesTicket, TicketComment, RMAReturn,
    Technician, WorkSchedule, KnowledgeArticle,
    Invoice, Payment,
)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing
    for tbl in reversed(Base.metadata.sorted_tables):
        db.execute(tbl.delete())
    db.commit()

    today = date.today()

    # ── Customers ──
    c1 = Customer(name="深圳华强电子有限公司", contact_person="张总", phone="13800138001",
                  email="zhang@huaqiang.com", company_address="深圳市福田区华强北路1001号",
                  industry_tags="电子元器件", source="展会")
    c2 = Customer(name="广州天河机械设备有限公司", contact_person="李经理", phone="13900139002",
                  email="li@tianhe.com", company_address="广州市天河区体育西路200号",
                  industry_tags="工业设备", source="老客户推荐")
    c3 = Customer(name="上海浦东精密仪器有限公司", contact_person="王工", phone="13700137003",
                  email="wang@pudong.com", company_address="上海市浦东新区张江高科技园区",
                  industry_tags="精密仪器", source="网络推广")
    db.add_all([c1, c2, c3])
    db.flush()

    # Contacts
    db.add_all([
        CustomerContact(customer_id=c1.id, name="张总", title="总经理", phone="13800138001", is_primary=True),
        CustomerContact(customer_id=c1.id, name="小陈", title="采购专员", phone="13800138002"),
        CustomerContact(customer_id=c2.id, name="李经理", title="采购经理", phone="13900139002", is_primary=True),
    ])

    # ── Suppliers ──
    s1 = Supplier(name="Samsung Electronics", country="韩国", contact_person="Mr. Kim",
                  phone="+82-2-1234-5678", email="kim@samsung.com",
                  product_categories="芯片,显示面板", payment_terms="T/T 30%预付", rating=4)
    s2 = Supplier(name="Siemens AG", country="德国", contact_person="Dr. Mueller",
                  phone="+49-89-636-00", email="mueller@siemens.com",
                  product_categories="工业电机,自动化设备", payment_terms="L/C 60天", rating=5)
    s3 = Supplier(name="Mitsubishi Electric", country="日本", contact_person="田中",
                  phone="+81-3-3218-2111", email="tanaka@mitsubishi.co.jp",
                  product_categories="伺服电机,PLC", payment_terms="T/T 50%预付", rating=4)
    db.add_all([s1, s2, s3])
    db.flush()

    # ── Products ──
    p1 = Product(name="伺服电机 SGM7J-01A", category="工业设备", sku="SGM7J-01A",
                 unit="台", hs_code="85015100", description="安川伺服电机 100W")
    p2 = Product(name="PLC控制器 S7-1200", category="自动化设备", sku="S7-1200-1214C",
                 unit="台", hs_code="85371011", description="西门子紧凑型PLC")
    p3 = Product(name="IGBT模块 CM100DY-24H", category="电子元器件", sku="CM100DY-24H",
                 unit="个", hs_code="85412900", description="三菱IGBT功率模块")
    p4 = Product(name="传感器 VL53L0X", category="电子元器件", sku="VL53L0X",
                 unit="个", hs_code="90318090", description="ST激光测距传感器")
    db.add_all([p1, p2, p3, p4])
    db.flush()

    # Supplier quotes
    db.add_all([
        SupplierQuote(supplier_id=s3.id, product_id=p1.id, price=580, currency="USD",
                      moq=10, lead_time_days=45, incoterms="FOB Tokyo", quoted_at=datetime.utcnow()),
        SupplierQuote(supplier_id=s2.id, product_id=p2.id, price=320, currency="EUR",
                      moq=5, lead_time_days=30, incoterms="EXW Munich", quoted_at=datetime.utcnow()),
        SupplierQuote(supplier_id=s3.id, product_id=p3.id, price=45, currency="USD",
                      moq=50, lead_time_days=30, incoterms="CIF Shanghai", quoted_at=datetime.utcnow()),
    ])

    # ── Forwarders ──
    f1 = FreightForwarder(name="中外运国际货运", contact_person="陈经理", phone="021-12345678",
                          email="chen@sinotrans.com", transport_modes="sea,air,rail", rating=4)
    f2 = FreightForwarder(name="顺丰国际", contact_person="刘先生", phone="0755-87654321",
                          email="liu@sf-express.com", transport_modes="air", rating=4)
    f3 = FreightForwarder(name="德迅货运 Kuehne+Nagel", contact_person="Ms. Wang",
                          phone="021-62345678", email="wang@kuehne-nagel.com",
                          transport_modes="sea,air", rating=5)
    db.add_all([f1, f2, f3])
    db.flush()

    db.add_all([
        FreightQuote(forwarder_id=f1.id, origin="Busan", destination="Shanghai",
                     transport_mode="sea", price=1200, currency="USD", transit_days=14,
                     incoterms="CIF Shanghai", quoted_at=datetime.utcnow()),
        FreightQuote(forwarder_id=f2.id, origin="Tokyo", destination="Shanghai",
                     transport_mode="air", price=3500, currency="USD", transit_days=3,
                     incoterms="CIP Shanghai", quoted_at=datetime.utcnow()),
        FreightQuote(forwarder_id=f3.id, origin="Busan", destination="Shanghai",
                     transport_mode="sea", price=1050, currency="USD", transit_days=16,
                     incoterms="CIF Shanghai", quoted_at=datetime.utcnow()),
    ])

    # ── Orders ──
    o1 = Order(order_no=f"TH{today.strftime('%Y%m%d')}0001", customer_id=c1.id, supplier_id=s3.id,
               forwarder_id=f3.id, status="customs", total_revenue=85000, purchase_cost=52000,
               freight_cost=7500, customs_cost=3500, net_profit=22000,
               estimated_delivery=today + timedelta(days=7), notes="第一批伺服电机样品")
    o2 = Order(order_no=f"TH{today.strftime('%Y%m%d')}0002", customer_id=c2.id, supplier_id=s2.id,
               forwarder_id=f1.id, status="ordered", total_revenue=120000, purchase_cost=75000,
               freight_cost=12000, customs_cost=5000, net_profit=28000,
               estimated_delivery=today + timedelta(days=30), notes="PLC控制器批量订单")
    o3 = Order(order_no=f"TH{today.strftime('%Y%m%d')}0003", customer_id=c3.id, supplier_id=s3.id,
               status="inquiry", total_revenue=35000, purchase_cost=22000,
               estimated_delivery=today + timedelta(days=45), notes="IGBT模块询价中")
    o4 = Order(order_no=f"TH{(today - timedelta(days=60)).strftime('%Y%m%d')}0004",
               customer_id=c1.id, supplier_id=s1.id, forwarder_id=f1.id,
               status="completed", total_revenue=68000, purchase_cost=41000,
               freight_cost=5500, customs_cost=2800, net_profit=18700,
               estimated_delivery=today - timedelta(days=15), actual_delivery=today - timedelta(days=18),
               notes="芯片批量订单，已完结")
    db.add_all([o1, o2, o3, o4])
    db.flush()

    # Order timeline
    db.add_all([
        OrderTimeline(order_id=o4.id, event_type="created", description="客户询价芯片产品", timestamp=datetime.utcnow() - timedelta(days=60)),
        OrderTimeline(order_id=o4.id, event_type="quoted", description="报价¥68,000已发送", timestamp=datetime.utcnow() - timedelta(days=58)),
        OrderTimeline(order_id=o4.id, event_type="ordered", description="客户确认下单", timestamp=datetime.utcnow() - timedelta(days=55)),
        OrderTimeline(order_id=o4.id, event_type="shipped", description="供应商发货，船名: COSCO SHIPPING", timestamp=datetime.utcnow() - timedelta(days=35)),
        OrderTimeline(order_id=o4.id, event_type="customs", description="到达上海港，申报中", timestamp=datetime.utcnow() - timedelta(days=22)),
        OrderTimeline(order_id=o4.id, event_type="delivered", description="货物交付客户", timestamp=datetime.utcnow() - timedelta(days=18)),
        OrderTimeline(order_id=o4.id, event_type="completed", description="订单完结，回款确认", timestamp=datetime.utcnow() - timedelta(days=10)),
    ])

    # ── Contracts ──
    db.add_all([
        Contract(order_id=o4.id, contract_no=f"SALES-{today.strftime('%Y%m')}-001",
                 type="sales", party_name="深圳华强电子有限公司",
                 content_json={"product": "IGBT模块", "quantity": "200个", "unit_price": "¥340/个", "delivery": "45天"},
                 status="signed", signed_at=datetime.utcnow() - timedelta(days=55)),
        Contract(order_id=o2.id, contract_no=f"SALES-{today.strftime('%Y%m')}-002",
                 type="sales", party_name="广州天河机械设备有限公司",
                 content_json={"product": "PLC控制器", "quantity": "20台", "unit_price": "¥6,000/台"},
                 status="signed", signed_at=datetime.utcnow() - timedelta(days=10)),
    ])

    # ── Technicians ──
    t1 = Technician(name="赵工", phone="13600136001", specialties="PLC,伺服电机,变频器")
    t2 = Technician(name="钱工", phone="13600136002", specialties="传感器,IGBT模块,嵌入式")
    t3 = Technician(name="孙工", phone="13600136003", specialties="机械维修,液压系统")
    db.add_all([t1, t2, t3])
    db.flush()

    # ── Tickets ──
    tk1 = AfterSalesTicket(order_id=o4.id, customer_id=c1.id,
                           title="伺服电机异响", priority="high", status="in_progress",
                           issue_type="repair", description="客户反馈电机运行时有不正常噪音",
                           assigned_to=t1.id)
    tk2 = AfterSalesTicket(order_id=o4.id, customer_id=c1.id,
                           title="IGBT模块参数咨询", priority="low", status="resolved",
                           issue_type="consultation", description="询问驱动电路匹配问题",
                           assigned_to=t2.id, resolution="已提供数据手册和推荐电路图",
                           resolved_at=datetime.utcnow() - timedelta(days=5))
    tk3 = AfterSalesTicket(title="新客户技术支持请求", priority="medium", status="open",
                           issue_type="consultation", description="上海客户需要现场技术评估",
                           customer_id=c3.id)
    db.add_all([tk1, tk2, tk3])
    db.flush()

    # Ticket comments
    db.add_all([
        TicketComment(ticket_id=tk2.id, content="请查看附件数据手册第12页的推荐电路", author="钱工"),
        TicketComment(ticket_id=tk2.id, content="好的谢谢，问题已解决", author="客户"),
    ])

    # ── RMA ──
    db.add(RMAReturn(order_id=o4.id, ticket_id=tk1.id, product_id=p3.id,
                     reason="电机噪音超标，客户要求换货", status="approved",
                     return_tracking_no="SF1234567890", refund_amount=0))

    # ── Knowledge ──
    db.add_all([
        KnowledgeArticle(title="伺服电机常见故障排查", content="1. 电机异响：检查轴承、联轴器\n2. 电机过热：检查负载率\n3. 编码器故障：检查接线", category="故障排查", tags="伺服电机,维修"),
        KnowledgeArticle(title="PLC选型指南", content="根据I/O点数、通讯协议、处理速度选择合适型号。小系统推荐S7-1200，中型推荐S7-1500。", category="技术选型", tags="PLC,西门子,选型"),
        KnowledgeArticle(title="进口设备报关注意事项", content="1. 确保HS编码准确\n2. 准备原产地证明\n3. 特殊设备需3C认证\n4. 旧设备需装运前检验", category="报关知识", tags="进口,报关,HS编码"),
    ])

    # ── Finance ──
    inv1 = Invoice(order_id=o4.id, invoice_no=f"INV-{today.strftime('%Y%m')}-001",
                   type="sales", amount=68000, currency="CNY", issue_date=today - timedelta(days=60),
                   due_date=today - timedelta(days=30), status="paid",
                   paid_at=datetime.utcnow() - timedelta(days=40))
    inv2 = Invoice(order_id=o2.id, invoice_no=f"INV-{today.strftime('%Y%m')}-002",
                   type="sales", amount=120000, currency="CNY", issue_date=today - timedelta(days=5),
                   due_date=today + timedelta(days=25), status="issued")
    inv3 = Invoice(order_id=o4.id, invoice_no=f"PINV-{today.strftime('%Y%m')}-001",
                   type="purchase", amount=41000, currency="CNY", issue_date=today - timedelta(days=55),
                   due_date=today - timedelta(days=25), status="paid",
                   paid_at=datetime.utcnow() - timedelta(days=30))
    db.add_all([inv1, inv2, inv3])
    db.flush()

    db.add_all([
        Payment(invoice_id=inv1.id, order_id=o4.id, amount=68000, currency="CNY",
                method="bank_transfer", reference_no="BANK202605001", paid_at=datetime.utcnow() - timedelta(days=40)),
        Payment(invoice_id=inv3.id, order_id=o4.id, amount=41000, currency="CNY",
                method="bank_transfer", reference_no="BANK202605002", paid_at=datetime.utcnow() - timedelta(days=30)),
    ])

    db.commit()
    db.close()

    print("✅ Seed data loaded successfully!")
    print(f"   3 customers, 3 suppliers, 3 forwarders, 4 products")
    print(f"   4 orders, 2 contracts, 3 tickets, 1 RMA")
    print(f"   3 technicians, 3 knowledge articles, 3 invoices, 2 payments")


if __name__ == "__main__":
    seed()
