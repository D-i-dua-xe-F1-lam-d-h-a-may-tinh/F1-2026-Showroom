using UnityEngine;

/// <summary>
/// Dữ liệu thông số kỹ thuật xe F1.
/// Được cập nhật realtime từ UI Slider trong GarageManager.
/// </summary>
[System.Serializable]
public class CarStats
{
    // ══════════════════════════════════════════════════
    // INPUT — Thông số người chơi điều chỉnh qua Slider
    // ══════════════════════════════════════════════════

    [Header("Energy Store")]
    [Tooltip("Năng lượng pin (MJ). FIA giới hạn ≤ 4.0 MJ")]
    [Range(0f, 6f)]
    public float batteryMJ = 2.0f;

    [Header("Fuel System")]
    [Tooltip("Lưu lượng nhiên liệu (kg/h). FIA giới hạn ≤ 100 kg/h")]
    [Range(0f, 150f)]
    public float fuelFlow = 80f;

    [Header("Aerodynamics")]
    [Tooltip("Góc cánh gió (độ). FIA cho phép 0° – 45°")]
    [Range(-10f, 60f)]
    public float wingAngle = 12f;

    // ══════════════════════════════════════════════════
    // OUTPUT — Hiệu năng tính toán (read-only từ UI)
    // ══════════════════════════════════════════════════

    [Header("Performance (Computed)")]
    [Tooltip("Tốc độ tối đa tính toán (km/h)")]
    public float topSpeed;

    [Tooltip("Gia tốc tính toán (m/s²)")]
    public float acceleration;

    // ══════════════════════════════════════════════════
    // METHODS
    // ══════════════════════════════════════════════════

    /// <summary>
    /// Tính toán hiệu năng dựa trên thông số hiện tại.
    /// Công thức FIA 2026:
    ///   topSpeed     = 300 + fuelFlow × 0.5 − wingAngle × 1.2
    ///   acceleration = 5   + batteryMJ × 2  − wingAngle × 0.5
    /// </summary>
    public void ComputePerformance()
    {
        topSpeed     = 300f + fuelFlow * 0.5f - wingAngle * 1.2f;
        acceleration = 5f   + batteryMJ * 2f  - wingAngle * 0.5f;
    }

    /// <summary>
    /// Trả về chuỗi mô tả hiệu năng hiện tại.
    /// </summary>
    public string GetPerformanceSummary()
    {
        return $"Top Speed: {topSpeed:F1} km/h | Acceleration: {acceleration:F2} m/s²";
    }

    /// <summary>
    /// Reset về giá trị mặc định an toàn (đảm bảo hợp lệ FIA).
    /// </summary>
    public void ResetToDefaults()
    {
        batteryMJ = 2.0f;
        fuelFlow  = 80f;
        wingAngle = 12f;
        ComputePerformance();
    }
}
