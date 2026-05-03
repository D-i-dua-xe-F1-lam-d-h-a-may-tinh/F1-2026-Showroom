/// <summary>
/// Hằng số quy định kỹ thuật FIA 2026.
/// Tập trung toàn bộ giới hạn ở một nơi duy nhất — dễ bảo trì khi FIA cập nhật luật.
/// </summary>
public static class FIARegulation
{
    // ══════════════════════════════════════════════════
    // ENERGY STORE (Pin năng lượng)
    // ══════════════════════════════════════════════════

    /// <summary>Năng lượng pin tối đa cho phép (MJ)</summary>
    public const float MAX_BATTERY_MJ = 4.0f;

    /// <summary>Mã lỗi khi vượt giới hạn pin</summary>
    public const string ERR_BATTERY = "ART.5.4.2";

    /// <summary>Mô tả lỗi pin</summary>
    public const string MSG_BATTERY =
        "Vi phạm ART.5.4.2 — Năng lượng pin vượt giới hạn {0:F1} MJ (tối đa {1} MJ)";

    // ══════════════════════════════════════════════════
    // FUEL FLOW (Lưu lượng nhiên liệu)
    // ══════════════════════════════════════════════════

    /// <summary>Lưu lượng nhiên liệu tối đa cho phép (kg/h)</summary>
    public const float MAX_FUEL_FLOW = 100f;

    /// <summary>Mã lỗi khi vượt giới hạn nhiên liệu</summary>
    public const string ERR_FUEL = "ART.5.10.3";

    /// <summary>Mô tả lỗi nhiên liệu</summary>
    public const string MSG_FUEL =
        "Vi phạm ART.5.10.3 — Lưu lượng nhiên liệu vượt {0:F1} kg/h (tối đa {1} kg/h)";

    // ══════════════════════════════════════════════════
    // WING ANGLE (Góc cánh gió)
    // ══════════════════════════════════════════════════

    /// <summary>Góc cánh gió tối thiểu (độ)</summary>
    public const float MIN_WING_ANGLE = 0f;

    /// <summary>Góc cánh gió tối đa (độ)</summary>
    public const float MAX_WING_ANGLE = 45f;

    /// <summary>Mã lỗi khi góc cánh ngoài phạm vi</summary>
    public const string ERR_WING = "ART.3.6.8";

    /// <summary>Mô tả lỗi góc cánh</summary>
    public const string MSG_WING =
        "Vi phạm ART.3.6.8 — Góc cánh gió {0:F1}° ngoài phạm vi cho phép ({1}° – {2}°)";
}
