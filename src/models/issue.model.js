import { DataTypes } from "sequelize";
import { database } from "../configs/sequelize.config.js";

export const Issue = database.define(
  "issue",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: { type: DataTypes.BIGINT.UNSIGNED },
    account_id: { type: DataTypes.STRING },
    project_id: { type: DataTypes.STRING },
    customer_id: { type: DataTypes.BIGINT.UNSIGNED },
    component_id: { type: DataTypes.BIGINT.UNSIGNED },
    reception_time: { type: DataTypes.DATE, comment: "Thời gian tiếp nhận" },
    completion_time: { type: DataTypes.DATE, comment: "Thời gian xử lý xong" },
    handling_time: {
      type: DataTypes.BIGINT.UNSIGNED,
      comment: "Thời gian xử lý/tồn (giờ)",
    },
    description: { type: DataTypes.TEXT, comment: "Hiện tượng" },
    severity: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM("PROCESSED", "PROCESSING", "UNPROCESSED") },
    type: { type: DataTypes.ENUM("NEW", "REOCCURRING") },

    scope_of_impact: {
      type: DataTypes.ENUM(
        "UNIT",
        "SERVICE_DELIVERY",
        "IMPORTANCE_OF_UNIT",
        "PRODUCT_FUNCTIONALITY",
        "USER_SAFETY",
        "PRODUCT_SECURITY",
        "PRODUCT_AVAILABILITY",
        "VIETTEL_REPUTATION"
      ),
      comment: "Phạm vi ảnh hưởng",
    },
    level: { type: DataTypes.STRING, comment: "Mức độ ảnh hưởng" },
    impact_point: {
      type: DataTypes.INTEGER.UNSIGNED,
      comment: "Điểm ảnh hưởng",
    },
    urgency_level: {
      type: DataTypes.ENUM("HIGH", "MEDIUM", "LOW"),
      comment: "Mức độ cấp thiết",
    },
    urgency_point: {
      type: DataTypes.INTEGER.UNSIGNED,
      comment: "Điểm cấp thiết",
    },

    responsible_handling_unit: {
      type: DataTypes.STRING,
      comment: "Đơn vị chịu trách nhiệm xử lý lỗi",
    },
    reporting_person: { type: DataTypes.STRING, comment: "Nhân sự báo lỗi" },
    remain_status: {
      type: DataTypes.ENUM("DONE", "REMAIN"),
      comment: "Tồn/chưa xử lý",
    },
    overdue_kpi: { type: DataTypes.BOOLEAN, comment: "Quá hạn so với KPI" },
    warranty_status: {
      type: DataTypes.ENUM("UNDER", "OVER"),
      comment: "Tình trạng bảo hành: Còn hạn BH/hết hạn BH",
    },
    overdue_kpi_reason: { type: DataTypes.STRING },
    impact: {
      type: DataTypes.ENUM("YES", "NO", "RESTRICTION"),
      comment: "Ảnh hưởng SSCĐ",
    },
    stop_fighting: { type: DataTypes.BOOLEAN, comment: "Dừng chiến đấu" },
    stop_fighting_days: {
      type: DataTypes.BIGINT.UNSIGNED,
      comment: "Số ngày dừng chiến đấu",
    },
    unhandle_reason: {
      type: DataTypes.ENUM(
        "OVER_WARRANTY",
        "PLAN_NOT_FINALIZED",
        "WARRANTY_NOT_PURCHASED",
        "WAREHOUSE_PROCEDURES_NOT_COMPLETED",
        "NO_REPLACEMENT_PERSON_ASSIGNED"
      ),
      comment: "Lý do chưa xử lý",
    },
    letter_send_vmc: { type: DataTypes.STRING, comment: "Công văn gửi VMC" },
    date: { type: DataTypes.DATE },
    material_status: { type: DataTypes.STRING, comment: "Tình trạng vật tư" },
    product_status: { type: DataTypes.STRING, comment: "Tình trạng sản phẩm" },
    handling_plan: { type: DataTypes.TEXT, comment: "Phương án xử lý" },
    error_alert: { type: DataTypes.STRING, comment: "Cảnh báo lỗi" },
    responsible_type: {
      type: DataTypes.ENUM(
        "USER", // lỗi do người sử dụng
        "ENVIROMENT", // Lỗi do thiên tai, địch hoạ, môi trường
        "DESIGN", // Lỗi do nghiên cứu, thiết kế, chế tạo
        "MANUFACTURING", // Lỗi do sản xuất, lắp đặt
        "MATERIAL", // Lỗi do vật tư, thiết bị
        "UNKNOWN"
      ),
      comment: "Phân loại trách nhiệm",
    },
    kpi_h: {
      type: DataTypes.BIGINT.UNSIGNED,
      comment:
        "Là thời gian tối đa được phép để xử lý sự cố, được tính từ lúc tiếp nhận sự cố từ bộ phận CSKH cho đến khi sự cố được xử lý xong",
    },
    handling_measures: { type: DataTypes.TEXT, comment: "Biện pháp xử lý" },
    repair_part: {
      type: DataTypes.STRING,
      comment: "Linh kiện thay thế/sửa chữa",
    },
    repair_part_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      comment: "Số lượng linh kiện thay thế/sửa chữa",
    },
    unit: {
      type: DataTypes.STRING,
      comment: "Đơn vị tính của số lượng linh kiện",
    },
    exp_date: {
      type: DataTypes.DATE,
      comment: "Hạn bảo hành",
    },
    note: { type: DataTypes.TEXT, comment: "Ghi chú" },
    price: { type: DataTypes.STRING, comment: "Chi phí/Thành tiền" },
    unit_price: { type: DataTypes.STRING, comment: "Đơn giá" },
    reason: { type: DataTypes.TEXT, comment: "Nguyên nhân gây ra lỗi" },
    responsible_type_description: {
      type: DataTypes.TEXT,
      comment: "Mô tả chi tiết loại lỗi",
    },
    unhandle_reason_description: {
      type: DataTypes.TEXT,
      comment: "Mô tả chi tiết lý do chưa xử lý ",
    },
    product_count: {
      type: DataTypes.BIGINT.UNSIGNED,
      comment: "Số lượng sản phẩm lỗi",
    },
  },
  { timestamps: false }
);
