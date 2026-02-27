import { C, fmtN, fmtDist, computeShipState, computeNewtonianState } from './physics';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ─── Retro rocket shape (pointing right, centered at cx, cy) ─────────────────
function drawRocket(ctx, cx, cy, color, outline = false) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(-12, -8);
  ctx.lineTo( -4, -4);
  ctx.lineTo(  6, -4);
  ctx.lineTo( 16,  0);
  ctx.lineTo(  6,  4);
  ctx.lineTo( -4,  4);
  ctx.lineTo(-12,  8);
  ctx.lineTo(-12,  4);
  ctx.closePath();
  if (outline) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    const glow = ctx.createRadialGradient(-12, 0, 0, -12, 0, 8);
    glow.addColorStop(0, color + 'AA');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(-12, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Grid step size for distance axis ────────────────────────────────────────
function getGridStep(totalLY) {
  if (totalLY <=     10) return 1;
  if (totalLY <=     50) return 5;
  if (totalLY <=    200) return 25;
  if (totalLY <=   1000) return 100;
  if (totalLY <=  10000) return 1000;
  return Math.pow(10, Math.floor(Math.log10(totalLY)));
}

// ─── Main canvas draw function ────────────────────────────────────────────────
export function drawSimCanvas(ctx, w, h, earthTime, flightProfiles, theme, totalDistLY, destinationName, showNewtonian = false) {
  const n       = flightProfiles.length;
  const finishX = w * 0.80;
  const shipY   = (i) => n <= 1 ? h * 0.5 : h * (0.15 + (i / (n - 1)) * 0.70);

  ctx.clearRect(0, 0, w, h);

  // 1. Distance grid
  const step = getGridStep(totalDistLY);
  for (let d = step; d < totalDistLY; d += step) {
    const x = (d / totalDistLY) * finishX;

    // Dashed gridline
    ctx.save();
    ctx.strokeStyle = theme.primary + '50';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, h); ctx.stroke();

    // Solid tick at the top
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.primary + 'AA';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 6); ctx.stroke();
    ctx.restore();

    // Label with backing rect
    const label = `${fmtDist(d)} LY`;
    ctx.font = `bold 9px ${MONO}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.70)';
    ctx.fillRect(x - tw / 2 - 3, 7, tw + 6, 14);
    ctx.fillStyle = theme.primary + 'CC';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, 18);
  }

  // 2. Lane tracks + stagger labels
  for (let i = 0; i < n; i++) {
    const y = shipY(i);
    ctx.save();
    ctx.strokeStyle = theme.primary + '30';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(finishX, y); ctx.stroke();
    ctx.fillStyle = theme.primary + 'CC';
    ctx.font      = `8px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(`+${Math.round(flightProfiles[i].launchTime)}y`, 4, y + 14);
    ctx.restore();
  }

  // 3. Finish line
  ctx.save();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.moveTo(finishX, 0); ctx.lineTo(finishX, h); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = theme.primary;
  ctx.font      = `bold 10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(destinationName.toUpperCase(), finishX + 10, 20);
  ctx.fillStyle = theme.secondary;
  ctx.font      = `9px ${MONO}`;
  ctx.fillText(`${fmtDist(totalDistLY)} LY`, finishX + 10, 34);

  // 4a. Newtonian ghost pass — drawn first so real ships paint over them
  if (showNewtonian) {
    for (let i = 0; i < n; i++) {
      const profile = flightProfiles[i];
      const ghost   = computeNewtonianState(earthTime, profile);
      if (!ghost.hasLaunched) continue;
      const gy = shipY(i) + 8;                                  // 8 px below real lane centre
      const gx = (ghost.pos / profile.totalDist) * finishX;
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawRocket(ctx, gx, gy, theme.secondary, true);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // 4. Per-ship: trails → rocket → label
  // Pre-compute arrival rank (1 = first to arrive) sorted by arrivalT
  const rankMap = {};
  [...flightProfiles].sort((a, b) => a.arrivalT - b.arrivalT)
    .forEach((p, idx) => { rankMap[p.id] = idx + 1; });
  const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

  for (let i = 0; i < n; i++) {
    const profile  = flightProfiles[i];
    const ship     = computeShipState(earthTime, profile);
    const y        = shipY(i);

    if (!ship.hasLaunched) {
      ctx.globalAlpha = 0.20;
      drawRocket(ctx, 4, y, theme.muted);
      ctx.globalAlpha = 1;
      continue;
    }

    const currentX = (ship.pos / profile.totalDist) * finishX;

    // Phase boundary X positions (for trail colouring)
    const accelEndX = profile.type === 'peak'
      ? (profile.peakDist  / profile.totalDist) * finishX
      : (profile.distToMax / profile.totalDist) * finishX;
    const cruiseEndX = profile.type === 'cruise'
      ? ((profile.totalDist - profile.distToMax) / profile.totalDist) * finishX
      : accelEndX;

    // Trail: accel (bright)
    if (currentX > 0) {
      const segEnd = Math.min(currentX, accelEndX);
      if (segEnd > 0) {
        ctx.save();
        ctx.strokeStyle = theme.primary; ctx.lineWidth = 3; ctx.globalAlpha = 0.90;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(segEnd, y); ctx.stroke();
        ctx.restore();
      }
    }
    // Trail: cruise (very dim)
    if (profile.type === 'cruise' && currentX > accelEndX) {
      const segEnd = Math.min(currentX, cruiseEndX);
      if (segEnd > accelEndX) {
        ctx.save();
        ctx.strokeStyle = theme.primary; ctx.lineWidth = 3; ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.moveTo(accelEndX, y); ctx.lineTo(segEnd, y); ctx.stroke();
        ctx.restore();
      }
    }
    // Trail: decel (amber)
    const decelStart = profile.type === 'peak' ? accelEndX : cruiseEndX;
    if (currentX > decelStart) {
      ctx.save();
      ctx.strokeStyle = '#FFB100'; ctx.lineWidth = 3; ctx.globalAlpha = 0.80;
      ctx.beginPath(); ctx.moveTo(decelStart, y); ctx.lineTo(currentX, y); ctx.stroke();
      ctx.restore();
    }

    drawRocket(ctx, currentX, y, ship.arrivedAt ? theme.secondary : theme.primary);

    if (ship.arrivedAt) {
      // ── Permanent arrival label to the right of the finish line ──────────
      const rank       = rankMap[profile.id];
      const badgeColor = rank <= 3 ? MEDAL[rank - 1] : theme.secondary;
      const lx = finishX + 12;
      const ly = y - 23;
      ctx.save();
      // Box
      ctx.fillStyle   = 'rgba(0,0,0,0.90)';
      ctx.strokeStyle = theme.primary + '70';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.rect(lx, ly, 82, 48); ctx.fill(); ctx.stroke();
      // Text
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.primary; ctx.font = `bold 9px ${MONO}`;
      ctx.fillText(profile.name.toUpperCase(), lx + 4, ly + 13);
      ctx.fillStyle = theme.secondary; ctx.font = `8px ${MONO}`;
      ctx.fillText(`CAP: ${(profile.configuredSol * 100).toFixed(1)}% SOL`, lx + 4, ly + 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`\u03C4 = ${fmtN(profile.finalShipTime, 2)}y`, lx + 4, ly + 39);
      // Rank badge — overlapping top-right corner of box
      const bx = lx + 82 - 1, by = ly + 1;
      const br = 9;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = badgeColor; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${rank >= 10 ? '7' : '9'}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(rank), bx, by + 3.5);
      ctx.restore();
    } else {
      // ── En-route label — visible until arrival ───────────────────────────
      const lx = currentX + 18;
      const ly = y + 10;
      ctx.save();
      ctx.fillStyle   = 'rgba(0,0,0,0.88)';
      ctx.strokeStyle = theme.muted + '99';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.rect(lx, ly, 82, 40); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 9px ${MONO}`;
      ctx.fillText(profile.name, lx + 4, ly + 13);
      ctx.fillStyle = theme.primary; ctx.font = `8px ${MONO}`;
      ctx.fillText(`${(ship.v / C * 100).toFixed(1)}% SOL`, lx + 4, ly + 25);
      ctx.fillStyle = theme.secondary;
      ctx.fillText(`SHIP T: ${fmtN(ship.shipTime, 1)}y`, lx + 4, ly + 36);
      ctx.restore();
    }
  }
}
