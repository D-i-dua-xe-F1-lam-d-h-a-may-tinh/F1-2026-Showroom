using System.Collections.Generic;

/// <summary>
/// Kiểm tra thông số xe theo quy định FIA 2026.
/// Trả về danh sách lỗi vi phạm (rỗng = hợp lệ).
/// </summary>
public static class Validator
{
    /// <summary>
    /// Kết quả validation — chứa danh sách lỗi và trạng thái từng thông số.
    /// </summary>
    public class ValidationResult
    {
        /// <summary>Danh sách mô tả lỗi vi phạm</summary>
        public List<string> errors = new List<string>();

        /// <summary>True nếu pin vi phạm</summary>
        public bool batteryViolation = false;

        /// <summary>True nếu nhiên liệu vi phạm</summary>
        public bool fuelViolation = false;

        /// <summary>True nếu cánh gió vi phạm</summary>
        public bool wingViolation = false;

        /// <summary>True nếu không có lỗi nào</summary>
        public bool IsValid => errors.Count == 0;

        /// <summary>
        /// Trả về chuỗi tổng hợp tất cả lỗi, phân cách bằng xuống dòng.
        /// Nếu hợp lệ, trả về "✅ Hợp lệ — FIA Compliant".
        /// </summary>
        public string GetDisplayText()
        {
            if (IsValid)
                return "✅ Hợp lệ — FIA Compliant";

            return "⚠️ VI PHẠM QUY ĐỊNH FIA:\n" + string.Join("\n", errors);
        }
    }

    // ══════════════════════════════════════════════════
    // MAIN VALIDATION
    // ══════════════════════════════════════════════════

    /// <summary>
    /// Kiểm tra toàn bộ thông số xe theo luật FIA 2026.
    /// </summary>
    /// <param name="stats">Thông số xe cần kiểm tra</param>
    /// <returns>Kết quả validation chứa danh sách lỗi và flag vi phạm</returns>
    public static ValidationResult Validate(CarStats stats)
    {
        var result = new ValidationResult();

        // ── 1. Kiểm tra pin (Battery) ──
        if (stats.batteryMJ > FIARegulation.MAX_BATTERY_MJ)
        {
            result.batteryViolation = true;
            result.errors.Add(string.Format(
                FIARegulation.MSG_BATTERY,
                stats.batteryMJ,
                FIARegulation.MAX_BATTERY_MJ
            ));
        }

        // ── 2. Kiểm tra nhiên liệu (Fuel Flow) ──
        if (stats.fuelFlow > FIARegulation.MAX_FUEL_FLOW)
        {
            result.fuelViolation = true;
            result.errors.Add(string.Format(
                FIARegulation.MSG_FUEL,
                stats.fuelFlow,
                FIARegulation.MAX_FUEL_FLOW
            ));
        }

        // ── 3. Kiểm tra góc cánh gió (Wing Angle) ──
        if (stats.wingAngle < FIARegulation.MIN_WING_ANGLE ||
            stats.wingAngle > FIARegulation.MAX_WING_ANGLE)
        {
            result.wingViolation = true;
            result.errors.Add(string.Format(
                FIARegulation.MSG_WING,
                stats.wingAngle,
                FIARegulation.MIN_WING_ANGLE,
                FIARegulation.MAX_WING_ANGLE
            ));
        }

        return result;
    }
}
