-- =============================================================================
-- SEED DATA & DATA RESET SCRIPT FOR ELECTRIC BIKE CRM (XE ĐIỆN MOVE)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. XOÁ DỮ LIỆU MẪU CŨ (CLEANUP OLD SAMPLE DATA)
DELETE FROM activities;
DELETE FROM tasks;
DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM opportunity_products;
DELETE FROM opportunity_stage_histories;
DELETE FROM opportunities;
DELETE FROM leads;
DELETE FROM customers;
DELETE FROM contacts;
DELETE FROM companies;
DELETE FROM campaigns;
DELETE FROM products;
DELETE FROM automation_execution_logs;
DELETE FROM automation_actions;
DELETE FROM automation_triggers;
DELETE FROM automations;
DELETE FROM notifications;
DELETE FROM audit_logs;

SET FOREIGN_KEY_CHECKS = 1;

-- 2. DANH SÁCH SẢN PHẨM XE ĐIỆN MOVE (TỪ 10.5M ĐẾN 54M VNĐ)
INSERT INTO products (id, name, code, type, description, unit_price, currency, is_active) VALUES
(1, 'Xe đạp điện trợ lực E6 Pro', 'MOVE-E6-PRO', 'PRODUCT', 'Động cơ 220W, Tốc độ tối đa 25km/h, Quãng đường 70km. Phù hợp học sinh.', 10800000.00, 'VND', 1),
(2, 'Xe máy điện STRONGER PRO', 'MOVE-STRONGER-PRO', 'PRODUCT', 'Động cơ 350W, Tốc độ 45km/h, Quãng đường 70km.', 10500000.00, 'VND', 1),
(3, 'Xe máy điện SPORT', 'MOVE-SPORT', 'PRODUCT', 'Động cơ 500W thể thao, Tốc độ 45km/h, Quãng đường 70km.', 10900000.00, 'VND', 1),
(4, 'Xe đạp điện trợ lực MOVE133', 'MOVE-133', 'PRODUCT', 'Dáng thể thao học sinh, Động cơ 220W, Quãng đường 70km.', 11500000.00, 'VND', 1),
(5, 'Xe đạp điện trợ lực MOVE007', 'MOVE-007', 'PRODUCT', 'Khung hợp kim nhôm siêu nhẹ, hỗ trợ Pin Lithium / Ắc quy.', 13900000.00, 'VND', 1),
(6, 'Xe máy điện MOVE ATHENA', 'MOVE-ATHENA', 'PRODUCT', 'Động cơ 500W, Tốc độ 45km/h, Thiết kế thời trang.', 14500000.00, 'VND', 1),
(7, 'Xe máy điện MOVE MENTOR', 'MOVE-MENTOR', 'PRODUCT', 'Động cơ 500W, Thiết kế đô thị thanh lịch.', 14700000.00, 'VND', 1),
(8, 'Xe máy điện MOVE ATHENA PRO', 'MOVE-ATHENA-PRO', 'PRODUCT', 'Động cơ 1000W mạnh mẽ, Tốc độ 45km/h, Quãng đường 90km.', 14990000.00, 'VND', 1),
(9, 'Xe đạp điện trợ lực MOVE946', 'MOVE-946', 'PRODUCT', 'Phong cách nữ tính quý phái, Động cơ 240W, Pin Lithium.', 16100000.00, 'VND', 1),
(10, 'Xe đạp điện trợ lực MOVE 911', 'MOVE-911', 'PRODUCT', 'Thiết kế Vintage độc đáo, Động cơ 240W, Pin Lithium.', 16500000.00, 'VND', 1),
(11, 'Xe máy điện MOVE ISABELLA', 'MOVE-ISABELLA', 'PRODUCT', 'Dáng xe Ý sang trọng, Động cơ 800W, Tốc độ 50km/h, 90km.', 19900000.00, 'VND', 1),
(12, 'Xe máy điện MOVE TARGET', 'MOVE-TARGET', 'PRODUCT', 'Động cơ 1500W, Tốc độ 50km/h, Quãng đường 120km, Pin Lithium 4.3Kw.', 32000000.00, 'VND', 1),
(13, 'Xe máy điện MOVE TARGET S', 'MOVE-TARGET-S', 'PRODUCT', 'Động cơ 3000W cao cấp, Tốc độ 80km/h, Quãng đường 200km.', 39000000.00, 'VND', 1),
(14, 'Xe máy điện MOVE THINKING', 'MOVE-THINKING', 'PRODUCT', 'Xe điện thông minh AI, Động cơ 3000W, Quãng đường 200km.', 39000000.00, 'VND', 1),
(15, 'Xe máy điện MOVE BOSS', 'MOVE-BOSS', 'PRODUCT', 'Flagship Động cơ 3000W, Tốc độ 85km/h, Quãng đường 180km.', 54000000.00, 'VND', 1),
(16, 'Xe máy điện MOVE MISSION', 'MOVE-MISSION', 'PRODUCT', 'Xe phượt điện cao cấp, Động cơ 3000W, Tốc độ 85km/h, 200km.', 54000000.00, 'VND', 1),
(17, 'Mũ bảo hiểm cao cấp MOVE', 'ACC-HELMET-MOVE', 'PRODUCT', 'Mũ bảo hiểm nửa đầu chính hãng MOVE tem CR.', 450000.00, 'VND', 1),
(18, 'Gói bảo dưỡng & Bảo hành Pin 3 năm', 'SRV-BATTERY-WAR3Y', 'SERVICE', 'Gói bảo dưỡng định kỳ 6 tháng + Đổi mới pin nếu chai > 20%.', 1500000.00, 'VND', 1);

-- 3. CHIẾN DỊCH QUẢNG CÁO (CAMPAIGNS)
INSERT INTO campaigns (id, name, code, type, status, budget, actual_cost, expected_revenue, owner_id) VALUES
(1, 'Chiến dịch Facebook Ads - Back to School Xe Điện Học Sinh', 'CAMP-FB-XEDIEN-SCHOOL', 'FB_ADS', 'ACTIVE', 30000000.00, 18500000.00, 250000000.00, 4),
(2, 'Chiến dịch Zalo Official - Đăng ký Lái thử Xe Điện MOVE TARGET', 'CAMP-ZALO-DEMO', 'ZALO', 'ACTIVE', 20000000.00, 12000000.00, 180000000.00, 4),
(3, 'Chiến dịch TikTok Viral - Xe máy điện MOVE Isabella & Athena Pro', 'CAMP-TIKTOK-ISABELLA', 'TIKTOK', 'ACTIVE', 40000000.00, 28000000.00, 400000000.00, 4);

-- 4. KHÁCH NHẮN TIN TỪ CÁC KÊNH (LEADS)
INSERT INTO leads (id, first_name, last_name, email, phone, source, status, rating, notes, campaign_id, owner_id) VALUES
(1, 'Đăng', 'Nguyễn Hải', 'haidang.nguyen@gmail.com', '0988112233', 'ZALO', 'NEW', 'HOT', 'Khách nhắn qua Zalo OA: Cần tư vấn xe đạp điện MOVE 133 cho con trai đi học lớp 8.', 2, 2),
(2, 'Anh', 'Phạm Hoàng', 'hoanganh.pham@outlook.com', '0977445566', 'FB_ADS', 'CONTACTED', 'HOT', 'Khách nhắn Messenger FB: Hỏi xe máy điện MOVE ISABELLA Trắng. Trả góp 0%.', 1, 3),
(3, 'Thư', 'Trần Thị Minh', 'minhthu.tran@yahoo.com', '0933667788', 'WEBSITE', 'QUALIFIED', 'HOT', 'Chat Livechat Website: Muốn xem xe MOVE ATHENA PRO màu Trắng Hồng tại Cầu Giấy.', NULL, 2),
(4, 'Nam', 'Lê Văn', 'vannam.le@gmail.com', '0905123456', 'TIKTOK', 'CONTACTED', 'WARM', 'Comment & Nhắn TikTok: Hỏi xe MOVE TARGET S động cơ 3000W 200km.', 3, 3),
(5, 'Ngọc', 'Vũ Bích', 'bichngoc.vu@gmail.com', '0918998877', 'HOTLINE', 'QUALIFIED', 'HOT', 'Gọi Hotline: Mua 2 chiếc xe đạp điện trợ lực E6 Pro cho bố mẹ.', NULL, 2),
(6, 'Trí', 'Đỗ Minh', 'minhtri.do@techcorp.vn', '0944556677', 'WALK_IN', 'QUALIFIED', 'HOT', 'Ghế trực tiếp Showroom: Khách thích xe máy điện MOVE BOSS màu Đen bóng.', NULL, 3);

-- 5. CƠ HỘI BÁN HÀNG (OPPORTUNITIES)
INSERT INTO opportunities (id, name, lead_id, owner_id, pipeline_id, stage_id, amount, probability, status, source, description) VALUES
(1, 'Tư vấn & Bán xe máy điện MOVE ISABELLA - Chị Hoàng Anh', 2, 3, 1, 4, 20350000.00, 65.00, 'OPEN', 'FB_ADS', 'Khách chọn màu Trắng ngọc trai + Mũ bảo hiểm MOVE.'),
(2, 'Trải nghiệm & Chốt xe MOVE TARGET S (3000W) - Anh Nam', 4, 3, 1, 3, 40500000.00, 45.00, 'OPEN', 'TIKTOK', 'Hẹn giao xe trải nghiệm lái thử tận nơi tại Hải Phòng.'),
(3, 'Đơn hàng 2 xe đạp điện trợ lực MOVE E6 Pro - Cô Bích Ngọc', 5, 2, 1, 6, 21600000.00, 100.00, 'WON', 'HOTLINE', 'Đã giao 2 xe tận nhà, thanh toán tiền mặt 100%.'),
(4, 'Đơn hàng xe điện cao cấp MOVE BOSS (3000W) - Anh Trí', 6, 3, 1, 6, 55950000.00, 100.00, 'WON', 'WALK_IN', 'Khách chốt xe tại Showroom, nhận xe trong ngày.'),
(5, 'Tư vấn xe máy điện MOVE ATHENA PRO - Chị Minh Thư', 3, 2, 1, 5, 15440000.00, 85.00, 'OPEN', 'WEBSITE', 'Khách xem xe trực tiếp ưng ý, đang chốt khuyến mãi.');

-- 6. BÁO GIÁ (QUOTES & ITEMS)
INSERT INTO quotes (id, opportunity_id, quote_number, version, subtotal, discount_amount, total_amount, currency, status, created_by) VALUES
(1, 1, 'BG-MOVE-2026-001', 1, 20350000.00, 350000.00, 20000000.00, 'VND', 'SENT', 3),
(2, 5, 'BG-MOVE-2026-002', 1, 15440000.00, 440000.00, 15000000.00, 'VND', 'ACCEPTED', 2);

INSERT INTO quote_items (id, quote_id, product_id, item_description, quantity, unit_price, total_price) VALUES
(1, 1, 11, 'Xe máy điện MOVE ISABELLA (Màu Trắng ngọc trai)', 1, 19900000.00, 19900000.00),
(2, 1, 17, 'Mũ bảo hiểm cao cấp MOVE tem CR', 1, 450000.00, 450000.00),
(3, 2, 8, 'Xe máy điện MOVE ATHENA PRO (Động cơ 1000W)', 1, 14990000.00, 14990000.00),
(4, 2, 17, 'Mũ bảo hiểm MOVE chính hãng', 1, 450000.00, 450000.00);

-- 7. LỊCH SỬ TƯ VẤN (ACTIVITIES)
INSERT INTO activities (id, type, subject, description, status, owner_id, completed_at, related_type, related_id) VALUES
(1, 'CHAT', 'Tư vấn Zalo OA: Chọn xe đạp điện cho học sinh', 'Khách hỏi xe MOVE 133 chiều cao 1m50 đi vừa không và thời gian sạc. Sales đã tư vấn chi tiết.', 'COMPLETED', 2, NOW(), 'LEAD', 1),
(2, 'CHAT', 'Nhắn tin Messenger: Tư vấn Trả góp 0% xe MOVE ISABELLA', 'Khách hỏi trả góp Visa VPBank 12 tháng. Sales tính dòng tiền mỗi tháng 1.69 triệu.', 'COMPLETED', 3, NOW(), 'LEAD', 2),
(3, 'CALL', 'Cuộc gọi tư vấn: Chốt đơn 2 xe MOVE E6 Pro', 'Xác nhận địa chỉ giao 2 xe E6 Pro tận nhà cho cô Bích Ngọc.', 'COMPLETED', 2, NOW(), 'OPPORTUNITY', 3),
(4, 'MEETING', 'Trải nghiệm & Lái thử xe MOVE BOSS tại Showroom', 'Anh Trí lái thử xe MOVE BOSS tại Showroom, chốt đơn trả thẳng nhận xe ngay.', 'COMPLETED', 3, NOW(), 'OPPORTUNITY', 4);

-- 8. NHIỆM VỤ SALE (TASKS)
INSERT INTO tasks (id, title, description, priority, status, assigned_to, due_at, related_type, related_id) VALUES
(1, 'Gửi bảng tính chi tiết trả góp xe Isabella qua Zalo', 'Gửi file PDF báo giá & hướng dẫn quẹt thẻ trả góp 0% cho chị Hoàng Anh', 'HIGH', 'TODO', 3, DATE_ADD(NOW(), INTERVAL 4 HOUR), 'OPPORTUNITY', 1),
(2, 'Xác nhận lịch hẹn lái thử xe MOVE TARGET S tại Hải Phòng', 'Liên hệ xe giao hàng mang xe MOVE TARGET S chạy thử cho anh Nam', 'URGENT', 'IN_PROGRESS', 3, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'OPPORTUNITY', 2),
(3, 'Gọi điện đăng ký biển số & làm giấy tờ xe cho anh Trí', 'Hỗ trợ khách làm thủ tục đăng ký biển xe máy điện MOVE BOSS', 'MEDIUM', 'TODO', 2, DATE_ADD(NOW(), INTERVAL 48 HOUR), 'OPPORTUNITY', 4);
