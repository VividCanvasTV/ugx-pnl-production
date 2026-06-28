/* Modular calculators for Asphalt, Concrete, and Custom Home */

// Number formatting function with comma separation (check if not already defined)
if (typeof formatNumber !== 'function') {
  window.formatNumber = function(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    const parts = Number(num).toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };
}

// Safe parser for numbers that may include commas or currency symbols
if (typeof parseNumber !== 'function') {
  window.parseNumber = function(value) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  };
}

function calculatorEscapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCalculator(jobType) {
  const container = document.getElementById('calculatorContainer');
  if (!container) {
    console.error('calculatorContainer not found!');
    return;
  }
  container.innerHTML = '';
  
  try {
  if (jobType === 'Asphalt') {
    container.appendChild(renderAsphaltCalculator());
  } else if (jobType === 'Concrete') {
    container.appendChild(renderConcreteCalculator());
  } else if (jobType === 'Dirt Moving') {
    container.appendChild(renderExcavationCalculator());
  } else if (jobType === 'Custom Home') {
    container.appendChild(renderCustomHomeCalculator());
    } else if (jobType === 'Pressure Washing') {
      const pw = renderPressureWashingCalculator();
      container.appendChild(pw);
      
      // Defensive: if critical inputs missing, re-render once after a tick
      setTimeout(() => {
        const insertBtn = document.getElementById('pwInsertMaterials');
        const waterInput = document.getElementById('pwWaterCostPerGallon');
        
        if (!insertBtn || !waterInput) {
          container.innerHTML = '';
          container.appendChild(renderPressureWashingCalculator());
        }
      }, 10);
    } else {
      container.replaceChildren();
    }
  } catch (e) {
    console.error('Error in renderCalculator:', e);
    container.innerHTML = '<div class="alert alert-danger">Error rendering calculator: ' + calculatorEscapeHtml(e.message) + '</div>';
  }
}

// Populate the Pressure Washing calculator with provided values
function populatePressureWashing(values) {
  if (!values) return;
  const setVal = (id, val, eventType = 'input') => {
    const el = document.getElementById(id);
    if (!el || val == null) return;
    if (el.type === 'checkbox') {
      el.checked = !!val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.value = val;
      el.dispatchEvent(new Event(eventType, { bubbles: true }));
    }
  };
  // Residential/General surfaces
  setVal('pwHouseSqft', values.houseSqft);
  setVal('pwHouseRate', values.houseRate);
  setVal('pwStuccoSqft', values.stuccoSqft);
  setVal('pwStuccoRate', values.stuccoRate);
  setVal('pwDrivewaySqft', values.drivewaySqft);
  setVal('pwDrivewayRate', values.drivewayRate);
  setVal('pwSidewalkSqft', values.sidewalkSqft);
  setVal('pwSidewalkRate', values.sidewalkRate);
  setVal('pwDeckSqft', values.deckSqft);
  setVal('pwDeckRate', values.deckRate);
  setVal('pwFenceLength', values.fenceLength);
  setVal('pwFenceRate', values.fenceRate);
  // Commercial
  setVal('pwParkingLotSqft', values.parkingLotSqft);
  setVal('pwParkingLotRate', values.parkingLotRate);
  setVal('pwGraffitiSqft', values.graffitiSqft);
  setVal('pwGraffitiRate', values.graffitiRate);
  // Water/Options
  if (values.waterCostPerGallon != null) setVal('pwWaterCostPerGallon', values.waterCostPerGallon);
  if (values.customerWater != null) setVal('pwCustomerWater', !!values.customerWater, 'change');
  if (values.gutterCleaning != null) setVal('pwGutterCleaning', !!values.gutterCleaning, 'change');
  if (values.gutterPrice != null) setVal('pwGutterPrice', values.gutterPrice);
  if (values.roofCleaning != null) setVal('pwRoofCleaning', !!values.roofCleaning, 'change');
  if (values.roofPrice != null) setVal('pwRoofPrice', values.roofPrice);
  if (values.windowCleaning != null) setVal('pwWindowCleaning', !!values.windowCleaning, 'change');
  if (values.windowPrice != null) setVal('pwWindowPrice', values.windowPrice);
}

function populateAsphaltRepair(values) {
  if (!values) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (!el || val == null) return;
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  Object.entries({
    aspRepairPatchCount: values.patchCount,
    aspRepairPatchLength: values.patchLength,
    aspRepairPatchWidth: values.patchWidth,
    aspRepairRemovalDepth: values.removalDepth,
    aspRepairReplacementDepth: values.replacementDepth,
    aspRepairWaste: values.repairWaste,
    aspRepairDensity: values.asphaltDensity,
    aspRepairCostPerTon: values.asphaltCostPerTon,
    aspRepairTackRate: values.tackRate,
    aspRepairTackCostPerGal: values.tackCostPerGal,
    aspRepairDisposalCostPerTon: values.disposalCostPerTon,
    aspRepairCrackLength: values.crackLength,
    aspRepairCrackWidth: values.crackWidth,
    aspRepairCrackDepth: values.crackDepth,
    aspRepairCrackWaste: values.crackWaste,
    aspRepairSealantCostPerGal: values.sealantCostPerGal,
    aspRepairSealantDensity: values.sealantDensityLbPerGal,
    aspRepairPatchProduction: values.patchProductionSfHr,
    aspRepairRoutingProduction: values.crackRoutingFtHr,
    aspRepairFillingProduction: values.crackFillingFtHr,
    aspRepairLaborRate: values.repairLaborRate,
    aspRepairEquipmentCost: values.repairEquipmentCost,
  }).forEach(([id, val]) => setVal(id, val));
}

function createSection(title) {
  const wrapper = document.createElement('div');
  const h = document.createElement('h5');
  h.textContent = title;
  h.className = 'mt-3';
  wrapper.appendChild(h);
  return wrapper;
}

function renderAsphaltCalculator() {
  const root = document.createElement('div');
  const sec = createSection('Asphalt Paving');
  sec.innerHTML += `
    <div class="row g-3 align-items-end">
      <div class="col-md-3"><label class="form-label">Length (ft)</label><input type="number" id="aspLength" class="form-control" min="0" step="0.01" value="100" /></div>
      <div class="col-md-3"><label class="form-label">Width (ft)</label><input type="number" id="aspWidth" class="form-control" min="0" step="0.01" value="20" /></div>
      <div class="col-md-3"><label class="form-label">Asphalt Thickness (in)</label><input type="number" id="aspThickness" class="form-control" min="0" step="0.1" value="3" /></div>
      <div class="col-md-3"><label class="form-label">Waste Factor (%)</label><input type="number" id="aspWaste" class="form-control" min="0" step="0.1" value="5" /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Asphalt Cost ($/ton)</label><input type="number" id="aspCostPerTon" class="form-control" min="0" step="0.01" value="85" /></div>
      <div class="col-md-3"><label class="form-label">Asphalt Density (lbs/ft³)</label><input type="number" id="aspDensity" class="form-control" min="0" step="0.1" value="145" /></div>
      <div class="col-md-3"><label class="form-label">Truck Capacity (tons)</label><input type="number" id="aspTruck" class="form-control" min="1" step="0.5" value="20" /></div>
      <div class="col-md-3"><label class="form-label">Square Feet</label><input type="text" id="aspSqFt" class="form-control" readonly /></div>
    </div>

    <h6 class="text-primary mt-3">Aggregate Base (optional)</h6>
    <div class="row g-3">
      <div class="col-md-4"><label class="form-label">Base Depth (in)</label><input type="number" id="aspBaseDepth" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-4"><label class="form-label">Base Density (lbs/ft³)</label><input type="number" id="aspBaseDensity" class="form-control" min="0" step="0.1" value="135" /></div>
      <div class="col-md-4"><label class="form-label">Base Cost ($/ton)</label><input type="number" id="aspBaseCost" class="form-control" min="0" step="0.01" value="28" /></div>
    </div>

    <h6 class="text-primary mt-3">Tack Coat (optional)</h6>
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Tack Rate (gal/yd²)</label><input type="number" id="aspTackRate" class="form-control" min="0" step="0.01" value="0.05" /></div>
      <div class="col-md-6"><label class="form-label">Tack Cost ($/gal)</label><input type="number" id="aspTackCostPerGal" class="form-control" min="0" step="0.01" value="3.50" /></div>
    </div>

    <div class="row g-3 mt-2">
      <div class="col-md-3"><label class="form-label">Asphalt Tons</label><input type="text" id="aspTons" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Asphalt Loads</label><input type="text" id="aspLoads" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Base Tons</label><input type="text" id="aspBaseTons" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Tack (gal)</label><input type="text" id="aspTackGal" class="form-control" readonly /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Asphalt Cost ($)</label><input type="text" id="aspMatCost" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Base Cost ($)</label><input type="text" id="aspBaseCostOut" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Tack Cost ($)</label><input type="text" id="aspTackCostOut" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Total Material ($)</label><input type="text" id="aspTotal" class="form-control fw-bold" readonly /></div>
    </div>
    <div class="alert alert-info mt-3">
      <strong>Formula:</strong> Tons = L × W × (Thickness ÷ 12) × Density ÷ 2000 × (1 + Waste%).
      Loads = ⌈Tons ÷ Truck⌉. Tack gal = (Area ÷ 9) × rate. <small>HMA ≈ 145 lbs/ft³.</small>
    </div>
    <div class="mt-2"><button type="button" class="btn btn-sm btn-outline-secondary" id="aspInsert">Add Asphalt to Materials</button></div>
  `;
  root.appendChild(sec);

  const repairSec = createSection('Patch Removal & Crack Filling');
  repairSec.innerHTML += `
    <div class="alert alert-warning mt-2">
      <strong>Internal repair calculator:</strong> Use measured patch size and crack dimensions. Customer itemization should be written separately in the Client Estimate section.
    </div>

    <h6 class="text-primary mt-3">Patch Removal / Replacement</h6>
    <div class="row g-3 align-items-end">
      <div class="col-md-2"><label class="form-label">Patch Count</label><input type="number" id="aspRepairPatchCount" class="form-control" min="0" step="1" value="4" /></div>
      <div class="col-md-2"><label class="form-label">Patch Length (ft)</label><input type="number" id="aspRepairPatchLength" class="form-control" min="0" step="0.01" value="10" /></div>
      <div class="col-md-2"><label class="form-label">Patch Width (ft)</label><input type="number" id="aspRepairPatchWidth" class="form-control" min="0" step="0.01" value="8" /></div>
      <div class="col-md-2"><label class="form-label">Removal Depth (in)</label><input type="number" id="aspRepairRemovalDepth" class="form-control" min="0" step="0.1" value="3" /></div>
      <div class="col-md-2"><label class="form-label">Replacement Depth (in)</label><input type="number" id="aspRepairReplacementDepth" class="form-control" min="0" step="0.1" value="3" /></div>
      <div class="col-md-2"><label class="form-label">Waste (%)</label><input type="number" id="aspRepairWaste" class="form-control" min="0" step="0.1" value="8" /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Asphalt Density (lbs/ft³)</label><input type="number" id="aspRepairDensity" class="form-control" min="0" step="0.1" value="145" /></div>
      <div class="col-md-3"><label class="form-label">HMA Cost ($/ton)</label><input type="number" id="aspRepairCostPerTon" class="form-control" min="0" step="0.01" value="95" /></div>
      <div class="col-md-3"><label class="form-label">Tack Rate (gal/yd²)</label><input type="number" id="aspRepairTackRate" class="form-control" min="0" step="0.01" value="0.07" /></div>
      <div class="col-md-3"><label class="form-label">Tack Cost ($/gal)</label><input type="number" id="aspRepairTackCostPerGal" class="form-control" min="0" step="0.01" value="3.50" /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Disposal ($/removed ton)</label><input type="number" id="aspRepairDisposalCostPerTon" class="form-control" min="0" step="0.01" value="55" /></div>
      <div class="col-md-3"><label class="form-label">Patch Area (sq ft)</label><input type="text" id="aspRepairPatchSf" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Saw Cut (linear ft)</label><input type="text" id="aspRepairSawCutLf" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Removed Tons</label><input type="text" id="aspRepairRemovedTons" class="form-control" readonly /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Removed Cubic Yards</label><input type="text" id="aspRepairRemovedCy" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Replacement HMA Tons</label><input type="text" id="aspRepairPatchTons" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Patch Tack (gal)</label><input type="text" id="aspRepairTackGal" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Patch Material ($)</label><input type="text" id="aspRepairPatchMatCost" class="form-control" readonly /></div>
    </div>

    <h6 class="text-primary mt-3">Crack Filling</h6>
    <div class="row g-3">
      <div class="col-md-3"><label class="form-label">Crack Length (ft)</label><input type="number" id="aspRepairCrackLength" class="form-control" min="0" step="0.1" value="500" /></div>
      <div class="col-md-3"><label class="form-label">Avg Routed Width (in)</label><input type="number" id="aspRepairCrackWidth" class="form-control" min="0" step="0.01" value="0.5" /></div>
      <div class="col-md-3"><label class="form-label">Avg Fill Depth (in)</label><input type="number" id="aspRepairCrackDepth" class="form-control" min="0" step="0.01" value="0.5" /></div>
      <div class="col-md-3"><label class="form-label">Sealant Waste (%)</label><input type="number" id="aspRepairCrackWaste" class="form-control" min="0" step="0.1" value="10" /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Sealant Cost ($/gal)</label><input type="number" id="aspRepairSealantCostPerGal" class="form-control" min="0" step="0.01" value="24" /></div>
      <div class="col-md-3"><label class="form-label">Sealant Density (lb/gal)</label><input type="number" id="aspRepairSealantDensity" class="form-control" min="0" step="0.1" value="9.2" /></div>
      <div class="col-md-3"><label class="form-label">Sealant Gallons</label><input type="text" id="aspRepairSealantGal" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Sealant Pounds</label><input type="text" id="aspRepairSealantLb" class="form-control" readonly /></div>
    </div>

    <h6 class="text-primary mt-3">Crew / Cost Controls</h6>
    <div class="row g-3">
      <div class="col-md-2"><label class="form-label">Patch SF/hr</label><input type="number" id="aspRepairPatchProduction" class="form-control" min="0" step="1" value="80" /></div>
      <div class="col-md-2"><label class="form-label">Routing ft/hr</label><input type="number" id="aspRepairRoutingProduction" class="form-control" min="0" step="1" value="250" /></div>
      <div class="col-md-2"><label class="form-label">Filling ft/hr</label><input type="number" id="aspRepairFillingProduction" class="form-control" min="0" step="1" value="350" /></div>
      <div class="col-md-3"><label class="form-label">Labor Rate ($/hr)</label><input type="number" id="aspRepairLaborRate" class="form-control" min="0" step="0.01" value="65" /></div>
      <div class="col-md-3"><label class="form-label">Equipment / Mobilization ($)</label><input type="number" id="aspRepairEquipmentCost" class="form-control" min="0" step="0.01" value="450" /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3"><label class="form-label">Labor Hours</label><input type="text" id="aspRepairLaborHours" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Material Cost ($)</label><input type="text" id="aspRepairMaterialCost" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Labor Cost ($)</label><input type="text" id="aspRepairLaborCost" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Other Cost ($)</label><input type="text" id="aspRepairOtherCost" class="form-control" readonly /></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-3 ms-auto"><label class="form-label">Repair Scenario Total ($)</label><input type="text" id="aspRepairTotalCost" class="form-control fw-bold" readonly /></div>
    </div>
    <div class="alert alert-info mt-3">
      <strong>Patch formula:</strong> Removed tons = Area × (Removal Depth ÷ 12) × Density ÷ 2000. Replacement tons adds waste to the replacement depth.<br>
      <strong>Crack formula:</strong> Sealant gallons = Crack Length × (Width ÷ 12) × (Depth ÷ 12) × 7.48052 × (1 + Waste%).
    </div>
    <div class="mt-2"><button type="button" class="btn btn-sm btn-outline-secondary" id="aspRepairInsert">Add Repair Scenario to Job</button></div>
  `;
  root.appendChild(repairSec);

  const recalc = () => {
    const n = (id) => parseNumber(document.getElementById(id).value) || 0;
    const areaSf = n('aspLength') * n('aspWidth');
    const waste = 1 + n('aspWaste') / 100;
    // Asphalt surface course
    const tons = (areaSf * (n('aspThickness') / 12) * (n('aspDensity') || 145) / 2000) * waste;
    const truck = n('aspTruck') || 20;
    const loads = tons > 0 ? Math.ceil(tons / truck) : 0;
    const asphaltCost = tons * n('aspCostPerTon');
    // Aggregate base course
    const baseTons = (areaSf * (n('aspBaseDepth') / 12) * (n('aspBaseDensity') || 135) / 2000) * waste;
    const baseCost = baseTons * n('aspBaseCost');
    // Tack coat (priced per square yard of area)
    const tackGal = (areaSf / 9) * n('aspTackRate');
    const tackCost = tackGal * n('aspTackCostPerGal');
    const total = asphaltCost + baseCost + tackCost;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = formatNumber(v); };
    set('aspSqFt', areaSf);
    set('aspTons', tons);
    document.getElementById('aspLoads').value = String(loads);
    set('aspBaseTons', baseTons);
    set('aspTackGal', tackGal);
    set('aspMatCost', asphaltCost);
    set('aspBaseCostOut', baseCost);
    set('aspTackCostOut', tackCost);
    set('aspTotal', total);
  };

  const getRepairMetrics = () => {
    const n = (id) => parseNumber(document.getElementById(id) ? document.getElementById(id).value : 0) || 0;
    const count = n('aspRepairPatchCount');
    const patchLength = n('aspRepairPatchLength');
    const patchWidth = n('aspRepairPatchWidth');
    const density = n('aspRepairDensity') || 145;
    const patchArea = count * patchLength * patchWidth;
    const sawCutLf = count * 2 * (patchLength + patchWidth);
    const removalCf = patchArea * (n('aspRepairRemovalDepth') / 12);
    const removedCy = removalCf / 27;
    const removedTons = (removalCf * density) / 2000;
    const patchWaste = 1 + n('aspRepairWaste') / 100;
    const replacementCf = patchArea * (n('aspRepairReplacementDepth') / 12);
    const patchTons = (replacementCf * density / 2000) * patchWaste;
    const tackGal = (patchArea / 9) * n('aspRepairTackRate');
    const patchMaterialCost = (patchTons * n('aspRepairCostPerTon')) + (tackGal * n('aspRepairTackCostPerGal'));

    const crackVolumeCf = n('aspRepairCrackLength') * (n('aspRepairCrackWidth') / 12) * (n('aspRepairCrackDepth') / 12);
    const sealantGal = crackVolumeCf * 7.48052 * (1 + n('aspRepairCrackWaste') / 100);
    const sealantLb = sealantGal * (n('aspRepairSealantDensity') || 0);
    const sealantCost = sealantGal * n('aspRepairSealantCostPerGal');
    const materialCost = patchMaterialCost + sealantCost;

    const patchHours = n('aspRepairPatchProduction') > 0 ? patchArea / n('aspRepairPatchProduction') : 0;
    const routingHours = n('aspRepairRoutingProduction') > 0 ? n('aspRepairCrackLength') / n('aspRepairRoutingProduction') : 0;
    const fillingHours = n('aspRepairFillingProduction') > 0 ? n('aspRepairCrackLength') / n('aspRepairFillingProduction') : 0;
    const laborHours = patchHours + routingHours + fillingHours;
    const laborCost = laborHours * n('aspRepairLaborRate');
    const disposalCost = removedTons * n('aspRepairDisposalCostPerTon');
    const otherCost = disposalCost + n('aspRepairEquipmentCost');
    const totalCost = materialCost + laborCost + otherCost;

    return {
      patchArea,
      sawCutLf,
      removedCy,
      removedTons,
      patchTons,
      tackGal,
      patchMaterialCost,
      sealantGal,
      sealantLb,
      sealantCost,
      materialCost,
      laborHours,
      laborCost,
      disposalCost,
      equipmentCost: n('aspRepairEquipmentCost'),
      otherCost,
      totalCost,
    };
  };

  const repairRecalc = () => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = formatNumber(v); };
    const metrics = getRepairMetrics();

    set('aspRepairPatchSf', metrics.patchArea);
    set('aspRepairSawCutLf', metrics.sawCutLf);
    set('aspRepairRemovedTons', metrics.removedTons);
    set('aspRepairRemovedCy', metrics.removedCy);
    set('aspRepairPatchTons', metrics.patchTons);
    set('aspRepairTackGal', metrics.tackGal);
    set('aspRepairPatchMatCost', metrics.patchMaterialCost);
    set('aspRepairSealantGal', metrics.sealantGal);
    set('aspRepairSealantLb', metrics.sealantLb);
    set('aspRepairLaborHours', metrics.laborHours);
    set('aspRepairMaterialCost', metrics.materialCost);
    set('aspRepairLaborCost', metrics.laborCost);
    set('aspRepairOtherCost', metrics.otherCost);
    set('aspRepairTotalCost', metrics.totalCost);
  };

  root.addEventListener('input', (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      recalc();
      repairRecalc();
    }
  });

  root.addEventListener('click', (e) => {
    if (!e.target || e.target.id !== 'aspInsert') return;
    if (typeof window.addMaterial !== 'function') return;
    const n = (id) => parseNumber(document.getElementById(id).value) || 0;
    const areaSf = n('aspSqFt'), tons = n('aspTons'), baseTons = n('aspBaseTons'), tackGal = n('aspTackGal');
    const items = [];
    if (tons > 0 && n('aspCostPerTon') > 0) items.push({ description: `Hot Mix Asphalt - ${formatNumber(areaSf)} sq ft @ ${n('aspThickness')}" (${formatNumber(tons)} tons)`, quantity: Number(tons.toFixed(2)), unitCost: n('aspCostPerTon') });
    if (baseTons > 0 && n('aspBaseCost') > 0) items.push({ description: `Aggregate Base - ${n('aspBaseDepth')}" (${formatNumber(baseTons)} tons)`, quantity: Number(baseTons.toFixed(2)), unitCost: n('aspBaseCost') });
    if (tackGal > 0 && n('aspTackCostPerGal') > 0) items.push({ description: `Tack Coat (${formatNumber(tackGal)} gal)`, quantity: Number(tackGal.toFixed(2)), unitCost: n('aspTackCostPerGal') });
    if (!items.length) { if (typeof showNotification === 'function') showNotification('warning', 'Nothing to add', 'Enter dimensions and rates first.'); return; }
    items.forEach((it) => window.addMaterial({ description: it.description, quantity: it.quantity, unitCost: it.unitCost, total: it.quantity * it.unitCost }));
    if (typeof calculateTotals === 'function') calculateTotals();
    if (typeof showNotification === 'function') showNotification('success', 'Asphalt Added', `${items.length} line items added to materials`);
  });

  root.addEventListener('click', (e) => {
    if (!e.target || (e.target.id !== 'aspRepairInsert' && !e.target.closest('#aspRepairInsert'))) return;
    if (typeof window.addMaterial !== 'function') return;
    const n = (id) => parseNumber(document.getElementById(id) ? document.getElementById(id).value : 0) || 0;
    repairRecalc();
    const metrics = getRepairMetrics();

    const materialItems = [];
    const laborItems = [];
    const otherItems = [];
    const patchTons = metrics.patchTons;
    const tackGal = metrics.tackGal;
    const sealantGal = metrics.sealantGal;
    const removedTons = metrics.removedTons;
    const laborHours = metrics.laborHours;
    const equipmentCost = metrics.equipmentCost;

    if (patchTons > 0 && n('aspRepairCostPerTon') > 0) {
      materialItems.push({ description: `Hot Mix Asphalt Patch Replacement (${formatNumber(metrics.patchArea)} sq ft, ${formatNumber(patchTons)} tons)`, quantity: Number(patchTons.toFixed(4)), unitCost: n('aspRepairCostPerTon') });
    }
    if (tackGal > 0 && n('aspRepairTackCostPerGal') > 0) {
      materialItems.push({ description: `Tack Coat for Patch Edges (${formatNumber(tackGal)} gal)`, quantity: Number(tackGal.toFixed(4)), unitCost: n('aspRepairTackCostPerGal') });
    }
    if (sealantGal > 0 && n('aspRepairSealantCostPerGal') > 0) {
      materialItems.push({ description: `Hot Pour Crack Sealant (${formatNumber(sealantGal)} gal / ${formatNumber(metrics.sealantLb)} lb)`, quantity: Number(sealantGal.toFixed(4)), unitCost: n('aspRepairSealantCostPerGal') });
    }
    if (laborHours > 0 && n('aspRepairLaborRate') > 0 && typeof window.addLabor === 'function') {
      laborItems.push({ description: `Patch removal and crack filling crew (${formatNumber(n('aspRepairCrackLength'))} LF cracks)`, hours: Number(laborHours.toFixed(4)), rate: n('aspRepairLaborRate') });
    }
    if (removedTons > 0 && n('aspRepairDisposalCostPerTon') > 0 && typeof window.addOther === 'function') {
      otherItems.push({ category: `Disposal of Removed Asphalt (${formatNumber(removedTons)} tons)`, cost: removedTons * n('aspRepairDisposalCostPerTon') });
    }
    if (equipmentCost > 0 && typeof window.addOther === 'function') {
      otherItems.push({ category: 'Saw / Router / Compactor Equipment', cost: equipmentCost });
    }

    if (!materialItems.length && !laborItems.length && !otherItems.length) {
      if (typeof showNotification === 'function') showNotification('warning', 'Nothing to add', 'Enter repair measurements and rates first.');
      return;
    }
    materialItems.forEach((it) => window.addMaterial({ description: it.description, quantity: it.quantity, unitCost: it.unitCost, total: it.quantity * it.unitCost }));
    laborItems.forEach((it) => window.addLabor(it));
    otherItems.forEach((it) => window.addOther(it));
    if (typeof calculateTotals === 'function') calculateTotals();
    if (typeof showNotification === 'function') showNotification('success', 'Asphalt Repair Added', `${materialItems.length + laborItems.length + otherItems.length} repair line items added`);
  });

  setTimeout(() => {
    recalc();
    repairRecalc();
  }, 0);
  return root;
}

function renderConcreteCalculator() {
  const root = document.createElement('div');
  const sec = createSection('Concrete Volume Calculator');
  sec.innerHTML += `
    <div class="row g-3 align-items-end">
      <div class="col-md-4">
        <label class="form-label">Length (ft)</label>
        <input type="number" id="conLength" class="form-control" min="0" step="0.01" value="20" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Width (ft)</label>
        <input type="number" id="conWidth" class="form-control" min="0" step="0.01" value="20" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Thickness/Depth (inches)</label>
        <input type="number" id="conThickness" class="form-control" min="0" step="0.1" value="4" />
      </div>
    </div>
    <div class="row g-3 mt-2">
      <div class="col-md-3">
        <label class="form-label">Concrete Type</label>
        <select id="conType" class="form-select">
          <option value="3000">3000 PSI ($140/yd³)</option>
          <option value="3500">3500 PSI ($150/yd³)</option>
          <option value="4000">4000 PSI ($160/yd³)</option>
          <option value="4500">4500 PSI ($170/yd³)</option>
          <option value="5000">5000 PSI ($180/yd³)</option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Price per yd³ ($)</label>
        <input type="number" id="conPricePerYd" class="form-control" min="0" step="0.01" value="140" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Waste Factor (%)</label>
        <input type="number" id="conWaste" class="form-control" min="0" step="0.1" value="5" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Rebar Add-on ($)</label>
        <input type="number" id="conMaterialsAddon" class="form-control" min="0" step="0.01" value="0" />
      </div>
    </div>
    <div class="row g-3 mt-2">
      <div class="col-md-3">
        <label class="form-label">Square Feet</label>
        <input type="text" id="conSqFt" class="form-control" readonly />
      </div>
      <div class="col-md-3">
        <label class="form-label">Cubic Yards</label>
        <input type="text" id="conYards" class="form-control" readonly />
      </div>
      <div class="col-md-3">
        <label class="form-label">Pounds (approx)</label>
        <input type="text" id="conPounds" class="form-control" readonly />
      </div>
      <div class="col-md-3">
        <label class="form-label">Total Cost ($)</label>
        <input type="text" id="conCost" class="form-control" readonly />
      </div>
    </div>
    <div class="mt-3">
      <div class="alert alert-info">
        <strong>Calculation Formula:</strong><br>
        Volume (cu yd) = Length × Width × (Thickness ÷ 12) ÷ 27<br>
        Weight = Volume × 4050 lbs/yd³ (typical concrete density)<br>
        <small>1 cubic yard = 27 cubic feet | Concrete weighs ~150 lbs/ft³</small>
      </div>
    </div>
    <div class="mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="conInsert">Add Concrete to Materials</button>
    </div>
  `;
  root.appendChild(sec);
  
  // Update price when concrete type changes (attach via delegation to avoid timing issues)
  root.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'conType') {
      const prices = {
        '3000': 140,
        '3500': 150,
        '4000': 160,
        '4500': 170,
        '5000': 180
      };
      const priceInput = root.querySelector('#conPricePerYd');
      if (priceInput) priceInput.value = prices[e.target.value] || 140;
      recalc();
    }
  });
  
  const recalc = () => {
    const lengthFt = parseNumber(document.getElementById('conLength').value) || 0;
    const widthFt = parseNumber(document.getElementById('conWidth').value) || 0;
    const thicknessIn = parseNumber(document.getElementById('conThickness').value) || 0;
    const pricePerYd = parseNumber(document.getElementById('conPricePerYd').value) || 0;
    const wastePct = parseNumber(document.getElementById('conWaste').value) || 0;
    const addon = parseNumber(document.getElementById('conMaterialsAddon').value) || 0;
    
    // Calculate area
    const areaFt2 = lengthFt * widthFt;
    
    // Calculate volume
    const thicknessFt = thicknessIn / 12;
    const volumeFt3 = areaFt2 * thicknessFt;
    const yards3 = volumeFt3 / 27;
    const yardsWithWaste = yards3 * (1 + wastePct / 100);
    
    // Calculate weight (concrete typically weighs 4050 lbs per cubic yard)
    const pounds = yardsWithWaste * 4050;
    
    // Calculate cost
    const cost = yardsWithWaste * pricePerYd + addon;
    
    // Update display
    document.getElementById('conSqFt').value = formatNumber(areaFt2);
    document.getElementById('conYards').value = formatNumber(yardsWithWaste);
    document.getElementById('conPounds').value = formatNumber(pounds);
    document.getElementById('conCost').value = formatNumber(cost);
  };
  
  root.addEventListener('input', (e) => {
    if (e.target && e.target.matches('#conLength, #conWidth, #conThickness, #conPricePerYd, #conWaste, #conMaterialsAddon')) {
      recalc();
    }
  });
  
  root.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'conInsert') {
      const sqft = parseNumber(document.getElementById('conSqFt').value) || 0;
      const yards = parseNumber(document.getElementById('conYards').value) || 0;
      const cost = parseNumber(document.getElementById('conCost').value) || 0;
      const thickness = parseNumber(document.getElementById('conThickness').value) || 0;
      const conType = document.getElementById('conType').selectedOptions[0].text;
      if (typeof window.addMaterial === 'function' && cost > 0) {
        window.addMaterial({ 
          description: `${conType} Concrete - ${formatNumber(sqft)} sq ft @ ${thickness}" thick (${formatNumber(yards)} yd³)`, 
          quantity: yards, 
          unitCost: parseNumber(document.getElementById('conPricePerYd').value) || 0, 
          total: cost 
        });
        
        // Show success notification
        if (typeof showNotification === 'function') {
          showNotification('success', 'Material Added', 'Concrete material added successfully');
        } else if (typeof window.showNotification === 'function') {
          window.showNotification('success', 'Material Added', 'Concrete material added successfully');
        }
        
        // Update totals
        if (typeof calculateTotals === 'function') {
          calculateTotals();
        } else if (typeof window.calculateTotals === 'function') {
          window.calculateTotals();
        }
      }
    }
  });
  
  setTimeout(recalc, 0);
  return root;
}

function renderCustomHomeCalculator() {
  const root = document.createElement('div');
  const sec = createSection('Custom Home Allowances');
  sec.innerHTML += `
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Square Footage (ft²)</label>
        <input type="number" id="homeSqft" class="form-control" min="0" step="1" value="2000" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Base Cost per ft² ($)</label>
        <input type="number" id="homeBaseCostPerSqft" class="form-control" min="0" step="0.01" value="200" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Upgrade Allowance ($)</label>
        <input type="number" id="homeUpgrades" class="form-control" min="0" step="0.01" value="25000" />
      </div>
    </div>
    <div class="row g-3 mt-2">
      <div class="col-md-4">
        <label class="form-label">Estimated Base Build Cost ($)</label>
        <input type="text" id="homeBaseCost" class="form-control" readonly />
      </div>
    </div>
    <div class="mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="homeInsert">Insert base estimate into Other</button>
    </div>
  `;
  root.appendChild(sec);
  const recalc = () => {
    const sqft = parseNumber(document.getElementById('homeSqft').value) || 0;
    const basePerSqft = parseNumber(document.getElementById('homeBaseCostPerSqft').value) || 0;
    const upgrades = parseNumber(document.getElementById('homeUpgrades').value) || 0;
    const base = sqft * basePerSqft + upgrades;
    document.getElementById('homeBaseCost').value = formatNumber(base);
  };
  root.addEventListener('input', (e) => {
    if (e.target && e.target.matches('#homeSqft, #homeBaseCostPerSqft, #homeUpgrades')) {
      recalc();
    }
  });
  root.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'homeInsert') {
      const base = parseNumber(document.getElementById('homeBaseCost').value) || 0;
      if (typeof window.addOther === 'function' && base > 0) {
        window.addOther({ category: 'Base Build Estimate', cost: base });
        
        // Show success notification
        if (typeof showNotification === 'function') {
          showNotification('success', 'Other Cost Added', 'Custom home estimate added successfully');
        } else if (typeof window.showNotification === 'function') {
          window.showNotification('success', 'Other Cost Added', 'Custom home estimate added successfully');
        }
        
        // Update totals
        if (typeof calculateTotals === 'function') {
          calculateTotals();
        } else if (typeof window.calculateTotals === 'function') {
          window.calculateTotals();
        }
      }
    }
  });
  setTimeout(recalc, 0);
  return root;
}

function renderPressureWashingCalculator() {
  const root = document.createElement('div');
  root.className = 'pressure-washing-calculator';
  
  // Surface types section
  const surfaceSection = createSection('Pressure Washing Services');
  surfaceSection.innerHTML += `
    <div class="alert alert-info mb-3">
      <i class="bi bi-info-circle me-2"></i>
      Calculate pressure washing costs for various surfaces. Prices include labor, equipment, and cleaning solutions.
    </div>
    
    <!-- Residential Surfaces -->
    <h6 class="mt-3 text-primary">Residential Surfaces</h6>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">House Exterior (Vinyl/Wood)</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwHouseSqft" class="form-control" min="0" step="100" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwHouseRate" class="form-control" min="0" step="0.01" value="0.15" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwHouseCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Stucco Surfaces</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwStuccoSqft" class="form-control" min="0" step="100" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwStuccoRate" class="form-control" min="0" step="0.01" value="0.20" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwStuccoCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Concrete Driveway</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwDrivewaySqft" class="form-control" min="0" step="50" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwDrivewayRate" class="form-control" min="0" step="0.01" value="0.10" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwDrivewayCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Sidewalks/Walkways</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwSidewalkSqft" class="form-control" min="0" step="25" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwSidewalkRate" class="form-control" min="0" step="0.01" value="0.08" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwSidewalkCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Deck/Patio</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwDeckSqft" class="form-control" min="0" step="25" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwDeckRate" class="form-control" min="0" step="0.01" value="0.25" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwDeckCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Fence</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Linear Feet</label>
                <input type="number" id="pwFenceLength" class="form-control" min="0" step="10" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/lin ft</label>
                <input type="number" id="pwFenceRate" class="form-control" min="0" step="0.01" value="2.00" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwFenceCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Commercial/Heavy Duty -->
    <h6 class="mt-4 text-primary">Commercial/Heavy Duty</h6>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Parking Lot/Large Concrete</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwParkingLotSqft" class="form-control" min="0" step="500" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwParkingLotRate" class="form-control" min="0" step="0.01" value="0.05" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwParkingLotCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">Graffiti Removal</h6>
            <div class="row g-2">
              <div class="col-8">
                <label class="form-label">Square Feet</label>
                <input type="number" id="pwGraffitiSqft" class="form-control" min="0" step="10" value="0" />
              </div>
              <div class="col-4">
                <label class="form-label">$/sq ft</label>
                <input type="number" id="pwGraffitiRate" class="form-control" min="0" step="0.01" value="3.00" />
              </div>
            </div>
            <div class="mt-2">
              <strong>Cost: $<span id="pwGraffitiCost">0.00</span></strong>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Additional Services -->
    <h6 class="mt-4 text-primary">Additional Services</h6>
    <div class="row g-3">
      <div class="col-md-4">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="pwGutterCleaning">
          <label class="form-check-label" for="pwGutterCleaning">
            Gutter Cleaning ($150-300)
          </label>
          <input type="number" id="pwGutterPrice" class="form-control form-control-sm mt-1" 
                 min="0" step="10" value="200" placeholder="Price" style="display:none;" />
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="pwRoofCleaning">
          <label class="form-check-label" for="pwRoofCleaning">
            Roof Soft Wash ($300-600)
          </label>
          <input type="number" id="pwRoofPrice" class="form-control form-control-sm mt-1" 
                 min="0" step="10" value="450" placeholder="Price" style="display:none;" />
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="pwWindowCleaning">
          <label class="form-check-label" for="pwWindowCleaning">
            Window Cleaning ($100-250)
          </label>
          <input type="number" id="pwWindowPrice" class="form-control form-control-sm mt-1" 
                 min="0" step="10" value="150" placeholder="Price" style="display:none;" />
        </div>
      </div>
    </div>
    
    <!-- Results -->
    <div class="mt-4 p-3 bg-light rounded">
      <h5>Pressure Washing Estimate</h5>
      <div class="row">
        <div class="col-md-6">
          <p class="mb-1">Subtotal: <strong>$<span id="pwSubtotal">0.00</span></strong></p>
          <p class="mb-1">Setup/Travel Fee: <strong>$<span id="pwSetupFee">50.00</span></strong></p>
        </div>
        <div class="col-md-6">
          <p class="mb-1">Total Cost: <strong class="text-primary">$<span id="pwTotalCost">0.00</span></strong></p>
          <button type="button" class="btn btn-sm btn-success mt-2" id="pwInsertMaterials">
            <i class="bi bi-plus-circle me-1"></i>Add to Materials
          </button>
        </div>
      </div>
    </div>
  `;
  
  root.appendChild(surfaceSection);
  
  // Settings: Water and Chemical configuration
  const settingsSection = createSection('Water & Chemical Settings');
  settingsSection.innerHTML += `
    <div class="card">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Use Customer Water (no water cost)</label>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="pwCustomerWater">
              <label class="form-check-label" for="pwCustomerWater">Enabled</label>
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Water Cost ($/gal)</label>
            <input type="number" id="pwWaterCostPerGallon" class="form-control" min="0" step="0.001" value="0.005" />
            <small class="text-muted">Typical muni water ~ $5 per 1,000 gal</small>
          </div>
          <div class="col-md-4">
            <label class="form-label">Notes</label>
            <div class="form-text">Adjust rates to your market; values are editable.</div>
          </div>
        </div>
        <hr/>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Siding Water (gal/sq ft)</label>
            <input type="number" id="pwSidingWaterPerSqft" class="form-control" min="0" step="0.001" value="0.040" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Flatwork Water (gal/sq ft)</label>
            <input type="number" id="pwFlatWaterPerSqft" class="form-control" min="0" step="0.001" value="0.060" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Fence Water (gal/lin ft)</label>
            <input type="number" id="pwFenceWaterPerLf" class="form-control" min="0" step="0.01" value="0.40" />
          </div>
        </div>
        <hr/>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">House Wash Mix ($/gal)</label>
            <input type="number" id="pwHouseChemPrice" class="form-control" min="0" step="0.01" value="3.00" />
          </div>
          <div class="col-md-6">
            <label class="form-label">House Wash Coverage (sq ft/gal)</label>
            <input type="number" id="pwHouseChemCoverage" class="form-control" min="1" step="1" value="400" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Stucco Mix ($/gal)</label>
            <input type="number" id="pwStuccoChemPrice" class="form-control" min="0" step="0.01" value="3.50" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Stucco Coverage (sq ft/gal)</label>
            <input type="number" id="pwStuccoChemCoverage" class="form-control" min="1" step="1" value="350" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Concrete Degreaser ($/gal)</label>
            <input type="number" id="pwConcreteChemPrice" class="form-control" min="0" step="0.01" value="12.00" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Degreaser Coverage (sq ft/gal)</label>
            <input type="number" id="pwConcreteChemCoverage" class="form-control" min="1" step="1" value="150" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Graffiti Remover ($/gal)</label>
            <input type="number" id="pwGraffitiChemPrice" class="form-control" min="0" step="0.01" value="45.00" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Graffiti Coverage (sq ft/gal)</label>
            <input type="number" id="pwGraffitiChemCoverage" class="form-control" min="1" step="1" value="50" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Deck Cleaner ($/gal)</label>
            <input type="number" id="pwDeckChemPrice" class="form-control" min="0" step="0.01" value="10.00" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Deck Cleaner Coverage (sq ft/gal)</label>
            <input type="number" id="pwDeckChemCoverage" class="form-control" min="1" step="1" value="200" />
          </div>
        </div>
      </div>
    </div>
  `;
  root.appendChild(settingsSection);
  
  // Materials breakdown section
  const breakdownSection = createSection('Materials Breakdown (Auto-calculated)');
  breakdownSection.innerHTML += `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="p-3 bg-light rounded h-100">
          <h6>Chemicals</h6>
          <ul class="mb-0">
            <li>House Wash Mix: <strong><span id="pwHouseChemGal">0.00</span> gal</strong> ($<span id="pwHouseChemCost">0.00</span>)</li>
            <li>Stucco Mix: <strong><span id="pwStuccoChemGal">0.00</span> gal</strong> ($<span id="pwStuccoChemCost">0.00</span>)</li>
            <li>Concrete Degreaser: <strong><span id="pwConcreteChemGal">0.00</span> gal</strong> ($<span id="pwConcreteChemCost">0.00</span>)</li>
            <li>Graffiti Remover: <strong><span id="pwGraffitiChemGal">0.00</span> gal</strong> ($<span id="pwGraffitiChemCost">0.00</span>)</li>
            <li>Deck Cleaner: <strong><span id="pwDeckChemGal">0.00</span> gal</strong> ($<span id="pwDeckChemCost">0.00</span>)</li>
          </ul>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-3 bg-light rounded h-100">
          <h6>Water</h6>
          <p class="mb-1">Total Water: <strong><span id="pwWaterGallons">0.00</span> gal</strong></p>
          <p class="mb-0">Water Cost: <strong>$<span id="pwWaterCost">0.00</span></strong></p>
        </div>
      </div>
      <div class="col-12">
        <div class="p-3 bg-white border rounded">
          <h6 class="mb-1">Materials Subtotal</h6>
          <p class="mb-0"><strong>$<span id="pwMaterialsTotal">0.00</span></strong></p>
        </div>
      </div>
    </div>
  `;
  root.appendChild(breakdownSection);
  
  // Calculate function
  function recalc() {
    let baseSubtotal = 0; // base labor/equipment from sq ft rates
    const fieldValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : 0;
    };
    const fieldChecked = (id) => {
      const el = document.getElementById(id);
      return !!(el && el.checked);
    };
    // Gather settings
    const customerWater = fieldChecked('pwCustomerWater');
    const waterCostPerGallon = customerWater ? 0 : (parseNumber(fieldValue('pwWaterCostPerGallon')) || 0);
    const sidingWaterPerSqft = parseNumber(fieldValue('pwSidingWaterPerSqft')) || 0;
    const flatWaterPerSqft = parseNumber(fieldValue('pwFlatWaterPerSqft')) || 0;
    const fenceWaterPerLf = parseNumber(fieldValue('pwFenceWaterPerLf')) || 0;
    // Chemical prices and coverages
    const houseChemPrice = parseNumber(fieldValue('pwHouseChemPrice')) || 0;
    const houseChemCoverage = parseNumber(fieldValue('pwHouseChemCoverage')) || 1;
    const stuccoChemPrice = parseNumber(fieldValue('pwStuccoChemPrice')) || 0;
    const stuccoChemCoverage = parseNumber(fieldValue('pwStuccoChemCoverage')) || 1;
    const concreteChemPrice = parseNumber(fieldValue('pwConcreteChemPrice')) || 0;
    const concreteChemCoverage = parseNumber(fieldValue('pwConcreteChemCoverage')) || 1;
    const graffitiChemPrice = parseNumber(fieldValue('pwGraffitiChemPrice')) || 0;
    const graffitiChemCoverage = parseNumber(fieldValue('pwGraffitiChemCoverage')) || 1;
    const deckChemPrice = parseNumber(fieldValue('pwDeckChemPrice')) || 0;
    const deckChemCoverage = parseNumber(fieldValue('pwDeckChemCoverage')) || 1;
    
    // Residential surfaces
    const houseSqft = parseNumber(fieldValue('pwHouseSqft')) || 0;
    const houseRate = parseNumber(fieldValue('pwHouseRate')) || 0;
    const houseCost = houseSqft * houseRate;
    document.getElementById('pwHouseCost').textContent = formatNumber(houseCost);
    baseSubtotal += houseCost;
    const houseChemGal = houseSqft > 0 ? (houseSqft / houseChemCoverage) : 0;
    const houseChemCost = houseChemGal * houseChemPrice;
    const houseWaterGal = houseSqft * sidingWaterPerSqft;
    
    const stuccoSqft = parseNumber(fieldValue('pwStuccoSqft')) || 0;
    const stuccoRate = parseNumber(fieldValue('pwStuccoRate')) || 0;
    const stuccoCost = stuccoSqft * stuccoRate;
    document.getElementById('pwStuccoCost').textContent = formatNumber(stuccoCost);
    baseSubtotal += stuccoCost;
    const stuccoChemGal = stuccoSqft > 0 ? (stuccoSqft / stuccoChemCoverage) : 0;
    const stuccoChemCost = stuccoChemGal * stuccoChemPrice;
    const stuccoWaterGal = stuccoSqft * sidingWaterPerSqft;
    
    const drivewaySqft = parseNumber(fieldValue('pwDrivewaySqft')) || 0;
    const drivewayRate = parseNumber(fieldValue('pwDrivewayRate')) || 0;
    const drivewayCost = drivewaySqft * drivewayRate;
    document.getElementById('pwDrivewayCost').textContent = formatNumber(drivewayCost);
    baseSubtotal += drivewayCost;
    const drivewayChemGal = drivewaySqft > 0 ? (drivewaySqft / concreteChemCoverage) : 0;
    const drivewayChemCost = drivewayChemGal * concreteChemPrice;
    const drivewayWaterGal = drivewaySqft * flatWaterPerSqft;
    
    const sidewalkSqft = parseNumber(fieldValue('pwSidewalkSqft')) || 0;
    const sidewalkRate = parseNumber(fieldValue('pwSidewalkRate')) || 0;
    const sidewalkCost = sidewalkSqft * sidewalkRate;
    document.getElementById('pwSidewalkCost').textContent = formatNumber(sidewalkCost);
    baseSubtotal += sidewalkCost;
    const sidewalkChemGal = sidewalkSqft > 0 ? (sidewalkSqft / concreteChemCoverage) : 0;
    const sidewalkChemCost = sidewalkChemGal * concreteChemPrice;
    const sidewalkWaterGal = sidewalkSqft * flatWaterPerSqft;
    
    const deckSqft = parseNumber(fieldValue('pwDeckSqft')) || 0;
    const deckRate = parseNumber(fieldValue('pwDeckRate')) || 0;
    const deckCost = deckSqft * deckRate;
    document.getElementById('pwDeckCost').textContent = formatNumber(deckCost);
    baseSubtotal += deckCost;
    const deckChemGal = deckSqft > 0 ? (deckSqft / deckChemCoverage) : 0;
    const deckChemCost = deckChemGal * deckChemPrice;
    const deckWaterGal = deckSqft * flatWaterPerSqft;
    
    const fenceLength = parseNumber(fieldValue('pwFenceLength')) || 0;
    const fenceRate = parseNumber(fieldValue('pwFenceRate')) || 0;
    const fenceCost = fenceLength * fenceRate;
    document.getElementById('pwFenceCost').textContent = formatNumber(fenceCost);
    baseSubtotal += fenceCost;
    const fenceChemGal = fenceLength > 0 ? ((fenceLength * 6) / houseChemCoverage) : 0; // assume ~6 ft height equiv area
    const fenceChemCost = fenceChemGal * houseChemPrice;
    const fenceWaterGal = fenceLength * fenceWaterPerLf;
    
    // Commercial surfaces
    const parkingLotSqft = parseNumber(fieldValue('pwParkingLotSqft')) || 0;
    const parkingLotRate = parseNumber(fieldValue('pwParkingLotRate')) || 0;
    const parkingLotCost = parkingLotSqft * parkingLotRate;
    document.getElementById('pwParkingLotCost').textContent = formatNumber(parkingLotCost);
    baseSubtotal += parkingLotCost;
    const parkingLotChemGal = parkingLotSqft > 0 ? (parkingLotSqft / concreteChemCoverage) : 0;
    const parkingLotChemCost = parkingLotChemGal * concreteChemPrice;
    const parkingLotWaterGal = parkingLotSqft * flatWaterPerSqft;
    
    const graffitiSqft = parseNumber(fieldValue('pwGraffitiSqft')) || 0;
    const graffitiRate = parseNumber(fieldValue('pwGraffitiRate')) || 0;
    const graffitiCost = graffitiSqft * graffitiRate;
    document.getElementById('pwGraffitiCost').textContent = formatNumber(graffitiCost);
    baseSubtotal += graffitiCost;
    const graffitiChemGal = graffitiSqft > 0 ? (graffitiSqft / graffitiChemCoverage) : 0;
    const graffitiChemCost = graffitiChemGal * graffitiChemPrice;
    const graffitiWaterGal = graffitiSqft * flatWaterPerSqft;
    
    // Additional services
    if (fieldChecked('pwGutterCleaning')) {
      const gutterPrice = parseNumber(fieldValue('pwGutterPrice')) || 0;
      baseSubtotal += gutterPrice;
    }
    
    if (fieldChecked('pwRoofCleaning')) {
      const roofPrice = parseNumber(fieldValue('pwRoofPrice')) || 0;
      baseSubtotal += roofPrice;
    }
    
    if (fieldChecked('pwWindowCleaning')) {
      const windowPrice = parseNumber(fieldValue('pwWindowPrice')) || 0;
      baseSubtotal += windowPrice;
    }
    
    // Setup fee (waived for jobs over $500)
    const setupFee = baseSubtotal > 500 ? 0 : 50;
    document.getElementById('pwSetupFee').textContent = formatNumber(setupFee);
    
    // Totals for chemicals
    const totalChemGal = houseChemGal + stuccoChemGal + drivewayChemGal + sidewalkChemGal + deckChemGal + parkingLotChemGal + graffitiChemGal + fenceChemGal;
    const totalChemCost = houseChemCost + stuccoChemCost + drivewayChemCost + sidewalkChemCost + deckChemCost + parkingLotChemCost + graffitiChemCost + fenceChemCost;
    // Totals for water
    const totalWaterGallons = houseWaterGal + stuccoWaterGal + drivewayWaterGal + sidewalkWaterGal + deckWaterGal + parkingLotWaterGal + graffitiWaterGal + fenceWaterGal;
    const totalWaterCost = totalWaterGallons * waterCostPerGallon;
    const materialsTotal = totalChemCost + totalWaterCost;
    // Update breakdown UI with defensive checks
    const updateElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatNumber(value, 2);
    };
    
    updateElement('pwHouseChemGal', houseChemGal);
    updateElement('pwHouseChemCost', houseChemCost);
    updateElement('pwStuccoChemGal', stuccoChemGal);
    updateElement('pwStuccoChemCost', stuccoChemCost);
    updateElement('pwConcreteChemGal', drivewayChemGal + sidewalkChemGal + parkingLotChemGal);
    updateElement('pwConcreteChemCost', drivewayChemCost + sidewalkChemCost + parkingLotChemCost);
    updateElement('pwGraffitiChemGal', graffitiChemGal);
    updateElement('pwGraffitiChemCost', graffitiChemCost);
    updateElement('pwDeckChemGal', deckChemGal);
    updateElement('pwDeckChemCost', deckChemCost);
    updateElement('pwWaterGallons', totalWaterGallons);
    updateElement('pwWaterCost', totalWaterCost);
    updateElement('pwMaterialsTotal', materialsTotal);
    
    const totalCost = baseSubtotal + materialsTotal + setupFee;
    document.getElementById('pwSubtotal').textContent = formatNumber(baseSubtotal);
    document.getElementById('pwTotalCost').textContent = formatNumber(totalCost);
  }
  
  // Event listeners
  root.addEventListener('input', (e) => {
    if (e.target && (e.target.tagName === 'INPUT')) {
      recalc();
    }
  });
  
  // Handle all change events with delegation
  root.addEventListener('change', (e) => {
    if (!e.target) return;
    
    // Toggle water cost input
    if (e.target.id === 'pwCustomerWater') {
      const waterInput = document.getElementById('pwWaterCostPerGallon');
      if (waterInput) {
        if (e.target.checked) {
          waterInput.setAttribute('disabled', 'disabled');
        } else {
          waterInput.removeAttribute('disabled');
        }
      }
      recalc();
    }
    // Show/hide price inputs for additional services
    else if (e.target.id === 'pwGutterCleaning') {
      const priceInput = document.getElementById('pwGutterPrice');
      if (priceInput) priceInput.style.display = e.target.checked ? 'block' : 'none';
      recalc();
    } else if (e.target.id === 'pwRoofCleaning') {
      const priceInput = document.getElementById('pwRoofPrice');
      if (priceInput) priceInput.style.display = e.target.checked ? 'block' : 'none';
      recalc();
    } else if (e.target.id === 'pwWindowCleaning') {
      const priceInput = document.getElementById('pwWindowPrice');
      if (priceInput) priceInput.style.display = e.target.checked ? 'block' : 'none';
      recalc();
    }
  });
  
  // Insert materials button
  root.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'pwInsertMaterials') {
      const items = [];
      
      // Add surface items
      const houseSqft = parseNumber(document.getElementById('pwHouseSqft').value) || 0;
      if (houseSqft > 0) {
        items.push({
          description: 'Pressure Washing - House Exterior (sq ft)',
          quantity: houseSqft,
          unitCost: parseNumber(document.getElementById('pwHouseRate').value) || 0
        });
      }
      
      const stuccoSqft = parseNumber(document.getElementById('pwStuccoSqft').value) || 0;
      if (stuccoSqft > 0) {
        items.push({
          description: 'Pressure Washing - Stucco Surface (sq ft)',
          quantity: stuccoSqft,
          unitCost: parseNumber(document.getElementById('pwStuccoRate').value) || 0
        });
      }
      
      const drivewaySqft = parseNumber(document.getElementById('pwDrivewaySqft').value) || 0;
      if (drivewaySqft > 0) {
        items.push({
          description: 'Pressure Washing - Concrete Driveway (sq ft)',
          quantity: drivewaySqft,
          unitCost: parseNumber(document.getElementById('pwDrivewayRate').value) || 0
        });
      }
      
      const sidewalkSqft = parseNumber(document.getElementById('pwSidewalkSqft').value) || 0;
      if (sidewalkSqft > 0) {
        items.push({
          description: 'Pressure Washing - Sidewalk/Walkway (sq ft)',
          quantity: sidewalkSqft,
          unitCost: parseNumber(document.getElementById('pwSidewalkRate').value) || 0
        });
      }
      
      const deckSqft = parseNumber(document.getElementById('pwDeckSqft').value) || 0;
      if (deckSqft > 0) {
        items.push({
          description: 'Pressure Washing - Deck/Patio (sq ft)',
          quantity: deckSqft,
          unitCost: parseNumber(document.getElementById('pwDeckRate').value) || 0
        });
      }
      
      const fenceLength = parseNumber(document.getElementById('pwFenceLength').value) || 0;
      if (fenceLength > 0) {
        items.push({
          description: 'Pressure Washing - Fence (linear ft)',
          quantity: fenceLength,
          unitCost: parseNumber(document.getElementById('pwFenceRate').value) || 0
        });
      }
      
      const parkingLotSqft = parseNumber(document.getElementById('pwParkingLotSqft').value) || 0;
      if (parkingLotSqft > 0) {
        items.push({
          description: 'Pressure Washing - Parking Lot (sq ft)',
          quantity: parkingLotSqft,
          unitCost: parseNumber(document.getElementById('pwParkingLotRate').value) || 0
        });
      }
      
      const graffitiSqft = parseNumber(document.getElementById('pwGraffitiSqft').value) || 0;
      if (graffitiSqft > 0) {
        items.push({
          description: 'Pressure Washing - Graffiti Removal (sq ft)',
          quantity: graffitiSqft,
          unitCost: parseNumber(document.getElementById('pwGraffitiRate').value) || 0
        });
      }
      
      // Add additional services
      if (document.getElementById('pwGutterCleaning').checked) {
        items.push({
          description: 'Gutter Cleaning Service',
          quantity: 1,
          unitCost: parseNumber(document.getElementById('pwGutterPrice').value) || 0
        });
      }
      
      if (document.getElementById('pwRoofCleaning').checked) {
        items.push({
          description: 'Roof Soft Wash Service',
          quantity: 1,
          unitCost: parseNumber(document.getElementById('pwRoofPrice').value) || 0
        });
      }
      
      if (document.getElementById('pwWindowCleaning').checked) {
        items.push({
          description: 'Window Cleaning Service',
          quantity: 1,
          unitCost: parseNumber(document.getElementById('pwWindowPrice').value) || 0
        });
      }
      
      // Add computed chemicals as materials
      const addChemLine = (desc, gallons, pricePerGal) => {
        const qty = Math.max(0, gallons);
        const unit = Math.max(0, pricePerGal);
        if (qty > 0.01 && unit >= 0) {
          items.push({ 
            description: desc, 
            quantity: Number(qty.toFixed(2)), 
            unitCost: Number(unit.toFixed(2))
          });
        }
      };
      const addWaterLine = (gallons, pricePerGal) => {
        const qty = Math.max(0, gallons);
        const unit = Math.max(0, pricePerGal);
        if (qty > 0.01 && unit > 0) {
          items.push({ 
            description: 'Water Consumption (gallons)', 
            quantity: Number(qty.toFixed(2)), 
            unitCost: Number(unit.toFixed(3))
          });
        }
      };
      // Read back the last-calculated values from DOM to avoid recompute divergence
      const domNumber = (id) => parseNumber(document.getElementById(id).textContent) || 0;
      addChemLine('House Wash Mix (gal)', domNumber('pwHouseChemGal'), parseNumber(document.getElementById('pwHouseChemPrice').value) || 0);
      addChemLine('Stucco Mix (gal)', domNumber('pwStuccoChemGal'), parseNumber(document.getElementById('pwStuccoChemPrice').value) || 0);
      // Concrete chem combines driveway + sidewalk + parking lot
      addChemLine('Concrete Degreaser (gal)', domNumber('pwConcreteChemGal'), parseNumber(document.getElementById('pwConcreteChemPrice').value) || 0);
      addChemLine('Graffiti Remover (gal)', domNumber('pwGraffitiChemGal'), parseNumber(document.getElementById('pwGraffitiChemPrice').value) || 0);
      addChemLine('Deck Cleaner (gal)', domNumber('pwDeckChemGal'), parseNumber(document.getElementById('pwDeckChemPrice').value) || 0);
      addWaterLine(domNumber('pwWaterGallons'), (document.getElementById('pwCustomerWater').checked ? 0 : (parseNumber(document.getElementById('pwWaterCostPerGallon').value) || 0)));
      
      // Add setup fee if applicable
      const subtotal = parseNumber(document.getElementById('pwSubtotal').textContent) || 0;
      if (subtotal <= 500 && subtotal > 0) {
        items.push({
          description: 'Setup/Travel Fee',
          quantity: 1,
          unitCost: 50
        });
      }
      
      // Add items to materials
      if (typeof window.addMaterial === 'function') {
        items.forEach(item => {
          window.addMaterial({
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost
          });
        });
        
        // Trigger calculation update
        if (typeof calculateTotals === 'function') {
          calculateTotals();
        }
        
        // Show success notification
        if (typeof showNotification === 'function') {
          showNotification('success', 'Materials Added', `${items.length} items added to materials`);
        } else {
          alert(`${items.length} items added to materials`);
        }
      } else {
        console.error('window.addMaterial function not found!');
        alert('Error: Unable to add materials. Please refresh the page and try again.');
      }
    }
  });
  
  // Initialize calculations after DOM is ready
  setTimeout(() => {
    try {
      recalc();
    } catch (e) {
      console.error('Error initializing pressure washing calculator:', e);
    }
  }, 10);
  
  return root;
}

// Force recalculation of the Pressure Washing calculator by dispatching input events
function forcePWRecalc() {
  const ids = [
    'pwHouseSqft','pwHouseRate','pwStuccoSqft','pwStuccoRate','pwDrivewaySqft','pwDrivewayRate',
    'pwSidewalkSqft','pwSidewalkRate','pwDeckSqft','pwDeckRate','pwFenceLength','pwFenceRate',
    'pwParkingLotSqft','pwParkingLotRate','pwGraffitiSqft','pwGraffitiRate',
    'pwWaterCostPerGallon','pwSidingWaterPerSqft','pwFlatWaterPerSqft','pwFenceWaterPerLf',
    'pwHouseChemPrice','pwHouseChemCoverage','pwStuccoChemPrice','pwStuccoChemCoverage',
    'pwConcreteChemPrice','pwConcreteChemCoverage','pwGraffitiChemPrice','pwGraffitiChemCoverage',
    'pwDeckChemPrice','pwDeckChemCoverage'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function renderExcavationCalculator() {
  const root = document.createElement('div');
  const sec = createSection('Dirt Moving / Excavation');
  sec.innerHTML += `
    <div class="alert alert-info">
      Earthwork is measured three ways. <strong>Bank</strong> = undisturbed in-ground volume.
      <strong>Loose</strong> = after digging (it expands — "swell") and is what trucks haul.
      <strong>Compacted</strong> = after placing &amp; rolling (it shrinks). Enter your site dimensions; rates are editable.
    </div>

    <h6 class="text-primary">Soil &amp; Hauling Factors</h6>
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Swell Factor (%)</label>
        <input type="number" id="exSwell" class="form-control" min="0" step="1" value="25" />
        <small class="text-muted">Sand ~12, common earth ~25, clay ~30, rock ~50</small>
      </div>
      <div class="col-md-4">
        <label class="form-label">Shrinkage / Compaction (%)</label>
        <input type="number" id="exShrink" class="form-control" min="0" max="60" step="1" value="10" />
        <small class="text-muted">Bank shrinks this much once compacted</small>
      </div>
      <div class="col-md-4">
        <label class="form-label">Truck Capacity (loose yd³)</label>
        <input type="number" id="exTruck" class="form-control" min="1" step="0.5" value="12" />
        <small class="text-muted">Tandem ~10-14, tri-axle ~16-18</small>
      </div>
    </div>

    <h6 class="text-primary mt-4">Excavation &amp; Haul-Off</h6>
    <div class="row g-3 align-items-end">
      <div class="col-md-3"><label class="form-label">Length (ft)</label><input type="number" id="exLength" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-3"><label class="form-label">Width (ft)</label><input type="number" id="exWidth" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-3"><label class="form-label">Avg Depth (ft)</label><input type="number" id="exDepth" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-3"><label class="form-label">Excavate Rate ($/bank yd³)</label><input type="number" id="exDigRate" class="form-control" min="0" step="0.01" value="8" /></div>
      <div class="col-md-3"><label class="form-label">Haul ($/load)</label><input type="number" id="exHaulRate" class="form-control" min="0" step="0.01" value="75" /></div>
      <div class="col-md-3"><label class="form-label">Dump / Tipping ($/load)</label><input type="number" id="exDumpRate" class="form-control" min="0" step="0.01" value="60" /></div>
    </div>
    <div class="row g-3 mt-2">
      <div class="col-md-3"><label class="form-label">Bank yd³</label><input type="text" id="exBankCY" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Loose yd³ (hauled)</label><input type="text" id="exLooseCY" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Truck Loads</label><input type="text" id="exLoads" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Excavation Subtotal ($)</label><input type="text" id="exDigTotal" class="form-control" readonly /></div>
    </div>

    <h6 class="text-primary mt-4">Import &amp; Compacted Fill (optional)</h6>
    <div class="row g-3 align-items-end">
      <div class="col-md-3"><label class="form-label">Length (ft)</label><input type="number" id="exFLength" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-3"><label class="form-label">Width (ft)</label><input type="number" id="exFWidth" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-3"><label class="form-label">Avg Depth (ft)</label><input type="number" id="exFDepth" class="form-control" min="0" step="0.1" value="0" /></div>
      <div class="col-md-3"><label class="form-label">Fill Material ($/yd³ delivered)</label><input type="number" id="exFillRate" class="form-control" min="0" step="0.01" value="22" /></div>
      <div class="col-md-3"><label class="form-label">Place &amp; Compact ($/compacted yd³)</label><input type="number" id="exCompactRate" class="form-control" min="0" step="0.01" value="6" /></div>
    </div>
    <div class="row g-3 mt-2">
      <div class="col-md-3"><label class="form-label">Compacted yd³ needed</label><input type="text" id="exCompactCY" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Fill to buy (yd³)</label><input type="text" id="exBorrowCY" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Fill Subtotal ($)</label><input type="text" id="exFillTotal" class="form-control" readonly /></div>
      <div class="col-md-3"><label class="form-label">Total Earthwork ($)</label><input type="text" id="exGrandTotal" class="form-control fw-bold" readonly /></div>
    </div>

    <div class="alert alert-secondary mt-3 mb-2">
      <strong>Formulas:</strong>
      Bank yd³ = L × W × Depth ÷ 27 &nbsp;|&nbsp;
      Loose = Bank × (1 + Swell%) &nbsp;|&nbsp;
      Loads = ⌈Loose ÷ Truck⌉ &nbsp;|&nbsp;
      Fill to buy = Compacted ÷ (1 − Shrink%)
    </div>
    <div class="mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="exInsert">Add Earthwork to Materials</button>
    </div>
  `;
  root.appendChild(sec);

  const calc = () => {
    const n = (id) => parseNumber(document.getElementById(id).value) || 0;
    const swell = n('exSwell');
    const shrink = Math.min(n('exShrink'), 59); // guard against ÷0 at 100%
    const truck = n('exTruck') || 1;

    // Excavation & haul-off
    const bankCY = (n('exLength') * n('exWidth') * n('exDepth')) / 27;
    const looseCY = bankCY * (1 + swell / 100);
    const loads = looseCY > 0 ? Math.ceil(looseCY / truck) : 0;
    const digCost = bankCY * n('exDigRate');
    const haulCost = loads * n('exHaulRate');
    const dumpCost = loads * n('exDumpRate');
    const digTotal = digCost + haulCost + dumpCost;

    // Import & compacted fill
    const compactCY = (n('exFLength') * n('exFWidth') * n('exFDepth')) / 27;
    const borrowCY = compactCY / (1 - shrink / 100); // need extra bank to compact down
    const importCost = borrowCY * n('exFillRate');
    const compactCost = compactCY * n('exCompactRate');
    const fillTotal = importCost + compactCost;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = formatNumber(v); };
    set('exBankCY', bankCY);
    set('exLooseCY', looseCY);
    document.getElementById('exLoads').value = String(loads);
    set('exDigTotal', digTotal);
    set('exCompactCY', compactCY);
    set('exBorrowCY', borrowCY);
    set('exFillTotal', fillTotal);
    set('exGrandTotal', digTotal + fillTotal);
  };

  root.addEventListener('input', (e) => { if (e.target && e.target.tagName === 'INPUT') calc(); });

  root.addEventListener('click', (e) => {
    if (!e.target || e.target.id !== 'exInsert') return;
    const n = (id) => parseNumber(document.getElementById(id).value) || 0;
    if (typeof window.addMaterial !== 'function') return;
    const items = [];
    const bankCY = n('exBankCY'), loads = n('exLoads'), borrowCY = n('exBorrowCY'), compactCY = n('exCompactCY');
    if (bankCY > 0 && n('exDigRate') > 0) items.push({ description: `Excavation - ${formatNumber(bankCY)} bank yd³`, quantity: Number(bankCY.toFixed(2)), unitCost: n('exDigRate') });
    if (loads > 0 && n('exHaulRate') > 0) items.push({ description: `Hauling - ${loads} truck loads`, quantity: loads, unitCost: n('exHaulRate') });
    if (loads > 0 && n('exDumpRate') > 0) items.push({ description: `Dump / Tipping fees - ${loads} loads`, quantity: loads, unitCost: n('exDumpRate') });
    if (borrowCY > 0 && n('exFillRate') > 0) items.push({ description: `Import Fill - ${formatNumber(borrowCY)} yd³`, quantity: Number(borrowCY.toFixed(2)), unitCost: n('exFillRate') });
    if (compactCY > 0 && n('exCompactRate') > 0) items.push({ description: `Place & Compact - ${formatNumber(compactCY)} compacted yd³`, quantity: Number(compactCY.toFixed(2)), unitCost: n('exCompactRate') });
    if (!items.length) { if (typeof showNotification === 'function') showNotification('warning', 'Nothing to add', 'Enter dimensions and rates first.'); return; }
    items.forEach((it) => window.addMaterial({ description: it.description, quantity: it.quantity, unitCost: it.unitCost, total: it.quantity * it.unitCost }));
    if (typeof calculateTotals === 'function') calculateTotals();
    if (typeof showNotification === 'function') showNotification('success', 'Earthwork Added', `${items.length} line items added to materials`);
  });

  setTimeout(calc, 0);
  return root;
}

window.Calculators = { renderCalculator, populatePressureWashing, populateAsphaltRepair, forcePWRecalc, renderExcavationCalculator };


