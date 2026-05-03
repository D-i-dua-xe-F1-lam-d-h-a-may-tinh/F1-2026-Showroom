using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// GarageManager — Điều khiển toàn bộ UI Garage trong Unity.
/// Gắn script này vào một GameObject trống trong Scene.
///
/// HƯỚNG DẪN SETUP:
/// 1. Tạo Canvas → thêm 3 Slider (Battery, Fuel, Wing) + 1 Button (Done) + 2 Text (Status, Performance)
/// 2. Kéo thả các UI element vào các slot tương ứng trong Inspector
/// 3. (Tùy chọn) Kéo Engine GameObject vào slot engineObject để highlight khi vi phạm pin
/// 4. Play → điều chỉnh slider → xem validation realtime
/// </summary>
public class GarageManager : MonoBehaviour
{
    // ══════════════════════════════════════════════════
    // INSPECTOR — Kéo thả UI elements vào đây
    // ══════════════════════════════════════════════════

    [Header("═══ CAR DATA ═══")]
    [Tooltip("Thông số xe — tự động tạo nếu để trống")]
    public CarStats carStats = new CarStats();

    [Header("═══ UI SLIDERS ═══")]
    [Tooltip("Slider điều chỉnh năng lượng pin (0 – 6 MJ)")]
    public Slider batterySlider;

    [Tooltip("Slider điều chỉnh lưu lượng nhiên liệu (0 – 150 kg/h)")]
    public Slider fuelFlowSlider;

    [Tooltip("Slider điều chỉnh góc cánh gió (-10° – 60°)")]
    public Slider wingAngleSlider;

    [Header("═══ UI DISPLAY ═══")]
    [Tooltip("Text hiển thị trạng thái validation (lỗi hoặc hợp lệ)")]
    public Text statusText;

    [Tooltip("Text hiển thị thông số hiệu năng (Top Speed, Acceleration)")]
    public Text performanceText;

    [Tooltip("Nút Done — bị disable khi có lỗi vi phạm")]
    public Button doneButton;

    [Header("═══ SLIDER VISUAL FEEDBACK ═══")]
    [Tooltip("Ảnh Fill của Slider Battery (để đổi màu khi vi phạm)")]
    public Image batteryFillImage;

    [Tooltip("Ảnh Fill của Slider Fuel Flow")]
    public Image fuelFillImage;

    [Tooltip("Ảnh Fill của Slider Wing Angle")]
    public Image wingFillImage;

    [Header("═══ ENGINE HIGHLIGHT (Bonus) ═══")]
    [Tooltip("GameObject engine — sẽ đổi màu đỏ khi vi phạm pin")]
    public GameObject engineObject;

    // ── Màu mặc định & màu lỗi cho slider ──
    private readonly Color COLOR_NORMAL    = new Color(0.2f, 0.8f, 0.4f);  // Xanh lá
    private readonly Color COLOR_VIOLATION = new Color(0.9f, 0.15f, 0.1f); // Đỏ
    private readonly Color COLOR_ENGINE_OK = Color.white;
    private readonly Color COLOR_ENGINE_ERR = new Color(1f, 0.2f, 0.1f);   // Đỏ sáng

    // Cache Renderer của engine để đổi màu
    private Renderer engineRenderer;
    private Color engineOriginalColor;

    // ══════════════════════════════════════════════════
    // UNITY LIFECYCLE
    // ══════════════════════════════════════════════════

    void Start()
    {
        // ── Thiết lập phạm vi Slider ──
        SetupSlider(batterySlider,  0f, 6f,    carStats.batteryMJ);
        SetupSlider(fuelFlowSlider, 0f, 150f,  carStats.fuelFlow);
        SetupSlider(wingAngleSlider, -10f, 60f, carStats.wingAngle);

        // ── Đăng ký sự kiện thay đổi Slider ──
        if (batterySlider)  batterySlider.onValueChanged.AddListener(OnBatteryChanged);
        if (fuelFlowSlider) fuelFlowSlider.onValueChanged.AddListener(OnFuelChanged);
        if (wingAngleSlider) wingAngleSlider.onValueChanged.AddListener(OnWingChanged);

        // ── Đăng ký nút Done ──
        if (doneButton) doneButton.onClick.AddListener(OnDoneClicked);

        // ── Cache Engine Renderer ──
        if (engineObject)
        {
            engineRenderer = engineObject.GetComponent<Renderer>();
            if (engineRenderer != null)
                engineOriginalColor = engineRenderer.material.color;
        }

        // ── Validation lần đầu ──
        ValidateAndUpdateUI();

        Debug.Log("[GarageManager] ✅ Khởi tạo thành công — Điều chỉnh slider để thay đổi thông số xe");
    }

    void OnDestroy()
    {
        // Hủy đăng ký sự kiện để tránh memory leak
        if (batterySlider)  batterySlider.onValueChanged.RemoveListener(OnBatteryChanged);
        if (fuelFlowSlider) fuelFlowSlider.onValueChanged.RemoveListener(OnFuelChanged);
        if (wingAngleSlider) wingAngleSlider.onValueChanged.RemoveListener(OnWingChanged);
    }

    // ══════════════════════════════════════════════════
    // SLIDER CALLBACKS — Cập nhật CarStats realtime
    // ══════════════════════════════════════════════════

    /// <summary>Khi slider Battery thay đổi</summary>
    private void OnBatteryChanged(float value)
    {
        carStats.batteryMJ = value;
        ValidateAndUpdateUI();
    }

    /// <summary>Khi slider Fuel Flow thay đổi</summary>
    private void OnFuelChanged(float value)
    {
        carStats.fuelFlow = value;
        ValidateAndUpdateUI();
    }

    /// <summary>Khi slider Wing Angle thay đổi</summary>
    private void OnWingChanged(float value)
    {
        carStats.wingAngle = value;
        ValidateAndUpdateUI();
    }

    // ══════════════════════════════════════════════════
    // CORE — Validate + Cập nhật toàn bộ UI
    // ══════════════════════════════════════════════════

    /// <summary>
    /// Chạy validation, tính hiệu năng, và cập nhật toàn bộ UI.
    /// Được gọi mỗi khi slider thay đổi.
    /// </summary>
    private void ValidateAndUpdateUI()
    {
        // ── 1. Tính hiệu năng ──
        carStats.ComputePerformance();

        // ── 2. Chạy validation ──
        var result = Validator.Validate(carStats);

        // ── 3. Cập nhật UI Text trạng thái ──
        if (statusText != null)
        {
            statusText.text = result.GetDisplayText();
            statusText.color = result.IsValid
                ? new Color(0.2f, 0.9f, 0.4f) // Xanh lá khi hợp lệ
                : new Color(1f, 0.3f, 0.2f);   // Đỏ khi vi phạm
        }

        // ── 4. Cập nhật UI Text hiệu năng ──
        if (performanceText != null)
        {
            performanceText.text = carStats.GetPerformanceSummary();
        }

        // ── 5. Enable/Disable nút Done ──
        if (doneButton != null)
        {
            doneButton.interactable = result.IsValid;

            // Đổi màu nút Done theo trạng thái
            var btnColors = doneButton.colors;
            btnColors.normalColor = result.IsValid
                ? new Color(0.1f, 0.7f, 0.3f)  // Xanh khi hợp lệ
                : new Color(0.3f, 0.3f, 0.3f); // Xám khi bị disable
            doneButton.colors = btnColors;
        }

        // ── 6. Đổi màu slider fill khi vi phạm ──
        SetSliderColor(batteryFillImage,  result.batteryViolation);
        SetSliderColor(fuelFillImage,     result.fuelViolation);
        SetSliderColor(wingFillImage,     result.wingViolation);

        // ── 7. Bonus: Highlight engine khi vi phạm pin ──
        UpdateEngineHighlight(result.batteryViolation);

        // ── 8. Log chi tiết (debug) ──
        if (!result.IsValid)
        {
            Debug.LogWarning($"[Validator] ⚠️ {result.errors.Count} vi phạm FIA:\n{result.GetDisplayText()}");
        }
    }

    // ══════════════════════════════════════════════════
    // UI HELPERS
    // ══════════════════════════════════════════════════

    /// <summary>Thiết lập phạm vi và giá trị mặc định cho Slider</summary>
    private void SetupSlider(Slider slider, float min, float max, float defaultValue)
    {
        if (slider == null) return;
        slider.minValue = min;
        slider.maxValue = max;
        slider.value = defaultValue;
    }

    /// <summary>Đổi màu Fill Image của slider (đỏ nếu vi phạm, xanh nếu OK)</summary>
    private void SetSliderColor(Image fillImage, bool isViolation)
    {
        if (fillImage == null) return;
        fillImage.color = isViolation ? COLOR_VIOLATION : COLOR_NORMAL;
    }

    /// <summary>
    /// BONUS: Highlight engine object khi vi phạm pin.
    /// Đổi màu material sang đỏ + log cảnh báo.
    /// </summary>
    private void UpdateEngineHighlight(bool batteryViolation)
    {
        if (engineRenderer == null) return;

        if (batteryViolation)
        {
            // Đổi engine sang màu đỏ cảnh báo
            engineRenderer.material.color = COLOR_ENGINE_ERR;
            engineRenderer.material.SetColor("_EmissionColor", COLOR_ENGINE_ERR * 0.5f);
            Debug.LogWarning("[Engine] 🔴 CẢNH BÁO: Pin quá tải — Engine overheating!");
        }
        else
        {
            // Trả engine về màu gốc
            engineRenderer.material.color = engineOriginalColor;
            engineRenderer.material.SetColor("_EmissionColor", Color.black);
        }
    }

    // ══════════════════════════════════════════════════
    // BUTTON CALLBACK
    // ══════════════════════════════════════════════════

    /// <summary>Khi nhấn nút Done (chỉ gọi được khi hợp lệ)</summary>
    private void OnDoneClicked()
    {
        carStats.ComputePerformance();
        Debug.Log($"[GarageManager] ✅ DONE — Xe hợp lệ FIA 2026!");
        Debug.Log($"[GarageManager] 📊 {carStats.GetPerformanceSummary()}");
        Debug.Log($"[GarageManager] ⚡ Battery: {carStats.batteryMJ:F1} MJ | " +
                  $"⛽ Fuel: {carStats.fuelFlow:F1} kg/h | " +
                  $"✈️ Wing: {carStats.wingAngle:F1}°");

        // TODO: Chuyển sang scene tiếp theo hoặc lưu cấu hình
        // SceneManager.LoadScene("RaceScene");
    }
}
