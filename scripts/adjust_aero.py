"""
F1 2026 FIA Aerodynamic Compliance Adjuster — Blender Python Script
====================================================================
Author:  F1 Showroom Project
Target:  Blender 3.6+ / 4.x
Usage:   Import your F1 mesh (.3d/.glb/.stl), then run this script
         in Blender's Scripting workspace (or paste into the console).

What it does:
  1. Finds FRONT_WING objects and adjusts flap angles to FIA 2026 target
  2. Finds DIFFUSER object and adjusts height + exit angle
  3. Removes illegal BEAM_WING (banned in FIA 2026)
  4. Adjusts REAR_WING height to be within FIA limits
  5. Reports all corrections made

Object Naming Convention:
  The script searches for objects by name pattern. If your CAD exports
  use different names, update the SEARCH_PATTERNS dict below.
"""

import bpy
import math
from mathutils import Euler

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION — FIA 2026 TARGET VALUES
# ═══════════════════════════════════════════════════════════════

# All angles in degrees, heights in meters (Blender default)
FIA_2026_TARGETS = {
    # Front wing: target angle range for active aero (Z-Mode high DF)
    "front_wing_angle_deg": 15.0,       # Neutral position (range: 5–25°)
    "front_wing_min_angle": 5.0,        # X-Mode (low drag)
    "front_wing_max_angle": 25.0,       # Z-Mode (high downforce)
    
    # Rear diffuser
    "diffuser_exit_angle_deg": 22.0,    # Enlarged diffuser per FIA 2026
    "diffuser_height_m": 0.22,          # Height of diffuser exit (meters)
    "diffuser_y_position_m": 0.12,      # Y position from ground
    
    # Rear wing
    "rear_wing_max_height_m": 1.05,     # Max height from ground (1,050mm)
    "rear_wing_main_angle_deg": 12.0,   # Main element angle
    "rear_wing_flap_angle_deg": 20.0,   # DRS flap angle
}

# Search patterns for finding objects in the scene
SEARCH_PATTERNS = {
    "front_wing":   ["FRONT_WING", "FrontWing", "front_wing", "FW_"],
    "rear_wing":    ["REAR_WING", "RearWing", "rear_wing", "RW_"],
    "diffuser":     ["DIFFUSER", "Diffuser", "diffuser", "DIFF"],
    "beam_wing":    ["BEAM_WING", "BeamWing", "beam_wing", "BEAM"],
    "front_flaps":  ["flap", "FLAP", "Flap", "FW_FLAP", "FW_Element"],
}

# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def find_objects(patterns):
    """Find all objects matching any of the given name patterns."""
    found = []
    for obj in bpy.data.objects:
        for pattern in patterns:
            if pattern.lower() in obj.name.lower():
                found.append(obj)
                break
    return found


def deg_to_rad(degrees):
    return math.radians(degrees)


def rad_to_deg(radians):
    return math.degrees(radians)


def report(msg, level="INFO"):
    """Print to console and Blender info bar."""
    print(f"[FIA-2026] [{level}] {msg}")
    

# ═══════════════════════════════════════════════════════════════
# CORRECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def adjust_front_wing_angle():
    """
    Adjust front wing flap angles to FIA 2026 neutral position.
    In a real implementation, you'd animate between X-Mode and Z-Mode.
    """
    target = FIA_2026_TARGETS
    corrections = []
    
    # Find front wing group
    fw_objects = find_objects(SEARCH_PATTERNS["front_wing"])
    flap_objects = find_objects(SEARCH_PATTERNS["front_flaps"])
    
    all_fw = fw_objects + flap_objects
    
    if not all_fw:
        report("No front wing objects found. Check naming convention.", "WARNING")
        report("Expected patterns: " + str(SEARCH_PATTERNS["front_wing"]), "WARNING")
        return corrections
    
    for obj in all_fw:
        old_angle = rad_to_deg(obj.rotation_euler.x)
        
        # Only adjust if it has a significant rotation (it's a flap/element)
        if abs(old_angle) > 1.0:
            new_angle_rad = deg_to_rad(-target["front_wing_angle_deg"])
            
            correction = {
                "object": obj.name,
                "property": "rotation_euler.x",
                "old_value": f"{old_angle:.1f}°",
                "new_value": f"{-target['front_wing_angle_deg']:.1f}°",
            }
            
            obj.rotation_euler.x = new_angle_rad
            corrections.append(correction)
            report(f"Front wing '{obj.name}': {old_angle:.1f}° → {-target['front_wing_angle_deg']:.1f}°")
    
    if not corrections:
        report("Front wing elements found but no angle corrections needed.")
    
    return corrections


def adjust_diffuser():
    """
    Adjust rear diffuser exit angle and height to FIA 2026 spec.
    FIA 2026 features an enlarged diffuser to compensate for
    the removal of ground-effect Venturi tunnels.
    """
    target = FIA_2026_TARGETS
    corrections = []
    
    diff_objects = find_objects(SEARCH_PATTERNS["diffuser"])
    
    if not diff_objects:
        report("No diffuser object found. Check naming convention.", "WARNING")
        report("Expected patterns: " + str(SEARCH_PATTERNS["diffuser"]), "WARNING")
        return corrections
    
    for obj in diff_objects:
        # ── Adjust exit angle ──
        old_angle = rad_to_deg(obj.rotation_euler.x)
        new_angle = target["diffuser_exit_angle_deg"]
        new_angle_rad = deg_to_rad(new_angle)
        
        if abs(old_angle - new_angle) > 0.5:
            corrections.append({
                "object": obj.name,
                "property": "rotation_euler.x (exit angle)",
                "old_value": f"{old_angle:.1f}°",
                "new_value": f"{new_angle:.1f}°",
            })
            obj.rotation_euler.x = new_angle_rad
            report(f"Diffuser '{obj.name}' angle: {old_angle:.1f}° → {new_angle:.1f}°")
        
        # ── Adjust height (scale Y if needed) ──
        current_dim_y = obj.dimensions.y
        target_height = target["diffuser_height_m"]
        
        if abs(current_dim_y - target_height) > 0.01:
            scale_factor = target_height / max(current_dim_y, 0.001)
            old_scale = obj.scale.y
            obj.scale.y *= scale_factor
            
            corrections.append({
                "object": obj.name,
                "property": "scale.y (height)",
                "old_value": f"{current_dim_y*1000:.0f}mm",
                "new_value": f"{target_height*1000:.0f}mm",
            })
            report(f"Diffuser '{obj.name}' height: {current_dim_y*1000:.0f}mm → {target_height*1000:.0f}mm")
        
        # ── Adjust Y position ──
        target_y = target["diffuser_y_position_m"]
        if abs(obj.location.y - target_y) > 0.01:
            old_y = obj.location.y
            # Note: In Blender, Z is up. If your model uses Y-up, swap accordingly.
            # For Z-up (Blender default):
            old_z = obj.location.z
            obj.location.z = target_y
            
            corrections.append({
                "object": obj.name,
                "property": "location.z (height from ground)",
                "old_value": f"{old_z*1000:.0f}mm",
                "new_value": f"{target_y*1000:.0f}mm",
            })
    
    return corrections


def remove_beam_wing():
    """
    FIA 2026 eliminates the beam wing entirely.
    This function finds and removes it from the scene.
    """
    beam_objects = find_objects(SEARCH_PATTERNS["beam_wing"])
    corrections = []
    
    if not beam_objects:
        report("No beam wing found (good — FIA 2026 compliant).")
        return corrections
    
    for obj in beam_objects:
        corrections.append({
            "object": obj.name,
            "property": "DELETED",
            "old_value": f"Present at {obj.location}",
            "new_value": "Removed (FIA 2026 ban)",
        })
        report(f"REMOVING beam wing '{obj.name}' — banned in FIA 2026", "WARNING")
        
        # Select and delete
        bpy.data.objects.remove(obj, do_unlink=True)
    
    return corrections


def adjust_rear_wing_height():
    """
    Ensure rear wing top element is at or below FIA 2026 max height.
    """
    target = FIA_2026_TARGETS
    corrections = []
    
    rw_objects = find_objects(SEARCH_PATTERNS["rear_wing"])
    
    if not rw_objects:
        report("No rear wing objects found.", "WARNING")
        return corrections
    
    for obj in rw_objects:
        # In Blender Z-up: check location.z
        # In Three.js Y-up: the value was 1.08m (line 326 of car.js)
        # We need to determine which axis is "up" in the imported mesh
        
        # Try Z first (Blender convention)
        current_height = max(obj.location.z, obj.location.y)
        max_height = target["rear_wing_max_height_m"]
        
        if current_height > max_height:
            overshoot = current_height - max_height
            
            # Lower the object
            if obj.location.z > obj.location.y:
                obj.location.z -= overshoot
                axis = "z"
            else:
                obj.location.y -= overshoot
                axis = "y"
            
            corrections.append({
                "object": obj.name,
                "property": f"location.{axis} (height)",
                "old_value": f"{current_height*1000:.0f}mm",
                "new_value": f"{max_height*1000:.0f}mm",
            })
            report(f"Rear wing '{obj.name}': lowered by {overshoot*1000:.0f}mm to meet FIA limit")
        
        # Adjust angles
        old_angle = rad_to_deg(obj.rotation_euler.x)
        # Only adjust main element (first found) vs flap (subsequent)
        if "flap" in obj.name.lower() or "FLAP" in obj.name:
            new_angle = target["rear_wing_flap_angle_deg"]
        else:
            new_angle = target["rear_wing_main_angle_deg"]
        
        if abs(old_angle - new_angle) > 1.0:
            obj.rotation_euler.x = deg_to_rad(new_angle)
            corrections.append({
                "object": obj.name,
                "property": "rotation_euler.x",
                "old_value": f"{old_angle:.1f}°",
                "new_value": f"{new_angle:.1f}°",
            })
    
    return corrections


# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

def main():
    print("\n" + "="*60)
    print("  FIA 2026 AERODYNAMIC COMPLIANCE ADJUSTER")
    print("="*60 + "\n")
    
    all_corrections = []
    
    # Step 1: Front wing
    print("── Step 1: Front Wing Angle ──")
    all_corrections += adjust_front_wing_angle()
    
    # Step 2: Diffuser
    print("\n── Step 2: Rear Diffuser ──")
    all_corrections += adjust_diffuser()
    
    # Step 3: Remove beam wing
    print("\n── Step 3: Beam Wing Removal ──")
    all_corrections += remove_beam_wing()
    
    # Step 4: Rear wing height
    print("\n── Step 4: Rear Wing Height ──")
    all_corrections += adjust_rear_wing_height()
    
    # ── Summary ──
    print("\n" + "="*60)
    print(f"  CORRECTIONS APPLIED: {len(all_corrections)}")
    print("="*60)
    
    for i, c in enumerate(all_corrections, 1):
        print(f"  {i}. [{c['object']}] {c['property']}")
        print(f"     {c['old_value']} → {c['new_value']}")
    
    if not all_corrections:
        print("  No corrections needed — model appears FIA 2026 compliant!")
        print("  (Or objects were not found. Check naming patterns.)")
    
    print("\n" + "="*60)
    print("  NAMING CONVENTION FOR AUTO-DETECTION:")
    print("="*60)
    for key, patterns in SEARCH_PATTERNS.items():
        print(f"  {key}: {patterns}")
    
    # Update viewport
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.tag_redraw()
    
    return all_corrections


# Run
if __name__ == "__main__":
    corrections = main()
else:
    corrections = main()
