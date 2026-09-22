import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { RetrospectiveDay, TemperatureUnit, Theme } from "../types/weather";
import { CloudRain, Sparkles, Sun, Thermometer, Wind } from "lucide-react";

interface D3RetrospectiveChartProps {
  days: RetrospectiveDay[];
  unit: TemperatureUnit;
  averageTempC: number;
  averageTempF: number;
  theme?: Theme;
  onSelectDay?: (day: RetrospectiveDay) => void;
}

export const D3RetrospectiveChart: React.FC<D3RetrospectiveChartProps> = ({
  days,
  unit,
  averageTempC,
  averageTempF,
  theme = "dark",
  onSelectDay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<{
    max: boolean;
    min: boolean;
    area: boolean;
    average: boolean;
  }>({
    max: true,
    min: true,
    area: true,
    average: true,
  });

  const isDark = theme === "dark";
  const avgTemp = unit === "C" ? averageTempC : averageTempF;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !days || days.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 700;
    const height = Math.max(320, Math.min(400, Math.round(width * 0.48)));

    const margin = { top: 35, right: 30, bottom: 45, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto;");

    // Defs for gradients & filters
    const defs = svg.append("defs");

    // Max Temp Gradient (Warm Sunrise / Amber / Coral)
    const maxGrad = defs
      .append("linearGradient")
      .attr("id", "max-temp-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    maxGrad.append("stop").attr("offset", "0%").attr("stop-color", "#f59e0b");
    maxGrad.append("stop").attr("offset", "50%").attr("stop-color", "#f97316");
    maxGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444");

    // Min Temp Gradient (Cyan / Sky / Indigo)
    const minGrad = defs
      .append("linearGradient")
      .attr("id", "min-temp-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    minGrad.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4");
    minGrad.append("stop").attr("offset", "50%").attr("stop-color", "#3b82f6");
    minGrad.append("stop").attr("offset", "100%").attr("stop-color", "#6366f1");

    // Area Fill Gradient
    const areaGrad = defs
      .append("linearGradient")
      .attr("id", "temp-range-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    areaGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", isDark ? 0.35 : 0.25);
    areaGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#06b6d4")
      .attr("stop-opacity", isDark ? 0.08 : 0.05);

    // Glow filter for dots
    const filter = defs.append("filter").attr("id", "chart-glow").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse X Scale (categorical or index based on days)
    const xScale = d3
      .scalePoint<number>()
      .domain(days.map((_, i) => i))
      .range([0, innerWidth])
      .padding(0.25);

    // Parse Y Domain
    const allTemps = days.flatMap((d) => [
      unit === "C" ? d.maxTempC : d.maxTempF,
      unit === "C" ? d.minTempC : d.minTempF,
    ]);
    const minVal = Math.min(...allTemps, avgTemp);
    const maxVal = Math.max(...allTemps, avgTemp);
    const padding = (maxVal - minVal) * 0.18 || 3;

    const yScale = d3
      .scaleLinear()
      .domain([Math.floor(minVal - padding), Math.ceil(maxVal + padding)])
      .range([innerHeight, 0])
      .nice();

    // Horizontal Grid Lines
    const yTicks = yScale.ticks(6);
    g.append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(100, 116, 139, 0.15)")
      .attr("stroke-dasharray", "3,3");

    // 7-Day Average Reference Line
    if (visibleSeries.average) {
      const avgY = yScale(avgTemp);
      const avgGroup = g.append("g").attr("class", "avg-reference-line");
      avgGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", avgY)
        .attr("y2", avgY)
        .attr("stroke", isDark ? "#38bdf8" : "#0284c7")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.75);

      avgGroup
        .append("text")
        .attr("x", innerWidth - 6)
        .attr("y", avgY - 6)
        .attr("text-anchor", "end")
        .attr("fill", isDark ? "#7dd3fc" : "#0369a1")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .text(`Weekly Avg: ${avgTemp}°${unit}`);
    }

    // Shaded Range Area between Max and Min
    if (visibleSeries.area) {
      const areaGen = d3
        .area<RetrospectiveDay>()
        .x((_, i) => xScale(i) || 0)
        .y0((d) => yScale(unit === "C" ? d.minTempC : d.minTempF))
        .y1((d) => yScale(unit === "C" ? d.maxTempC : d.maxTempF))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(days)
        .attr("fill", "url(#temp-range-area-gradient)")
        .attr("d", areaGen);
    }

    // High Temperature Line
    const maxLineGen = d3
      .line<RetrospectiveDay>()
      .x((_, i) => xScale(i) || 0)
      .y((d) => yScale(unit === "C" ? d.maxTempC : d.maxTempF))
      .curve(d3.curveMonotoneX);

    if (visibleSeries.max) {
      g.append("path")
        .datum(days)
        .attr("fill", "none")
        .attr("stroke", "url(#max-temp-gradient)")
        .attr("stroke-width", 3.2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", maxLineGen);
    }

    // Low Temperature Line
    const minLineGen = d3
      .line<RetrospectiveDay>()
      .x((_, i) => xScale(i) || 0)
      .y((d) => yScale(unit === "C" ? d.minTempC : d.minTempF))
      .curve(d3.curveMonotoneX);

    if (visibleSeries.min) {
      g.append("path")
        .datum(days)
        .attr("fill", "none")
        .attr("stroke", "url(#min-temp-gradient)")
        .attr("stroke-width", 3.2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", minLineGen);
    }

    // Data Point Dots
    days.forEach((d, i) => {
      const x = xScale(i) || 0;
      const yMax = yScale(unit === "C" ? d.maxTempC : d.maxTempF);
      const yMin = yScale(unit === "C" ? d.minTempC : d.minTempF);
      const isHovered = hoveredIndex === i;

      // Connecting vertical pill per day
      g.append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", yMax)
        .attr("y2", yMin)
        .attr("stroke", isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,2");

      if (visibleSeries.max) {
        // High temp dot
        g.append("circle")
          .attr("cx", x)
          .attr("cy", yMax)
          .attr("r", isHovered ? 6.5 : 4.5)
          .attr("fill", "#f59e0b")
          .attr("stroke", isDark ? "#090e1c" : "#ffffff")
          .attr("stroke-width", 2.2)
          .attr("filter", isHovered ? "url(#chart-glow)" : "none");

        // High temp value label
        g.append("text")
          .attr("x", x)
          .attr("y", yMax - 9)
          .attr("text-anchor", "middle")
          .attr("fill", isDark ? "#fbbf24" : "#b45309")
          .attr("font-size", isHovered ? "11px" : "10px")
          .attr("font-weight", "700")
          .text(`${unit === "C" ? d.maxTempC : d.maxTempF}°`);
      }

      if (visibleSeries.min) {
        // Low temp dot
        g.append("circle")
          .attr("cx", x)
          .attr("cy", yMin)
          .attr("r", isHovered ? 6.5 : 4.5)
          .attr("fill", "#06b6d4")
          .attr("stroke", isDark ? "#090e1c" : "#ffffff")
          .attr("stroke-width", 2.2)
          .attr("filter", isHovered ? "url(#chart-glow)" : "none");

        // Low temp value label
        g.append("text")
          .attr("x", x)
          .attr("y", yMin + 18)
          .attr("text-anchor", "middle")
          .attr("fill", isDark ? "#38bdf8" : "#0284c7")
          .attr("font-size", isHovered ? "11px" : "10px")
          .attr("font-weight", "700")
          .text(`${unit === "C" ? d.minTempC : d.minTempF}°`);
      }
    });

    // X Axis Labels (Day name + formatted date)
    const xAxisGroup = g
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight + 12})`);

    days.forEach((d, i) => {
      const x = xScale(i) || 0;
      const isHovered = hoveredIndex === i;

      const dayGroup = xAxisGroup
        .append("g")
        .attr("transform", `translate(${x}, 0)`)
        .attr("cursor", "pointer")
        .on("click", () => onSelectDay?.(d));

      dayGroup
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", 0)
        .attr("fill", isHovered ? (isDark ? "#38bdf8" : "#0284c7") : (isDark ? "#cbd5e1" : "#475569"))
        .attr("font-size", "11px")
        .attr("font-weight", isHovered ? "700" : "600")
        .text(d.dayName);

      dayGroup
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", 14)
        .attr("fill", isDark ? "#64748b" : "#94a3b8")
        .attr("font-size", "9px")
        .attr("font-weight", "500")
        .text(d.dateFormatted);
    });

    // Y Axis (Left with unit label)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((v) => `${v}°${unit}`);

    const yAxisG = g.append("g").attr("class", "y-axis").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG
      .selectAll(".tick line")
      .attr("stroke", isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(100, 116, 139, 0.2)");
    yAxisG
      .selectAll(".tick text")
      .attr("fill", isDark ? "#94a3b8" : "#64748b")
      .attr("font-size", "10px")
      .attr("font-weight", "500");

    // Interactive Hover Overlay across entire chart
    const hoverRect = g
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair");

    hoverRect.on("mousemove", (event) => {
      const [mouseX] = d3.pointer(event);
      let closestIdx = 0;
      let minDistance = Infinity;

      days.forEach((_, i) => {
        const xPos = xScale(i) || 0;
        const dist = Math.abs(mouseX - xPos);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      });

      setHoveredIndex(closestIdx);
    });

    hoverRect.on("mouseleave", () => {
      setHoveredIndex(null);
    });

    hoverRect.on("click", () => {
      if (hoveredIndex !== null && days[hoveredIndex]) {
        onSelectDay?.(days[hoveredIndex]);
      }
    });

    // Active Hover Guide Line
    if (hoveredIndex !== null && days[hoveredIndex]) {
      const xHover = xScale(hoveredIndex) || 0;
      g.append("line")
        .attr("x1", xHover)
        .attr("x2", xHover)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", isDark ? "rgba(56, 189, 248, 0.5)" : "rgba(2, 132, 199, 0.5)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")
        .attr("pointer-events", "none");
    }
  }, [days, unit, avgTemp, theme, hoveredIndex, visibleSeries, onSelectDay]);

  // Active highlighted day info
  const activeDay = hoveredIndex !== null && days[hoveredIndex] ? days[hoveredIndex] : null;

  return (
    <div id="d3-retrospective-container" className="flex flex-col w-full space-y-3">
      {/* Chart Top Controls & Series Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        {/* Series Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <button
            onClick={() => setVisibleSeries((prev) => ({ ...prev, max: !prev.max }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              visibleSeries.max
                ? isDark
                  ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  : "bg-amber-50 border-amber-300 text-amber-800"
                : isDark
                ? "bg-slate-900 border-slate-800 text-slate-500"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-semibold">High Temp</span>
          </button>

          <button
            onClick={() => setVisibleSeries((prev) => ({ ...prev, min: !prev.min }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              visibleSeries.min
                ? isDark
                  ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
                  : "bg-cyan-50 border-cyan-300 text-cyan-800"
                : isDark
                ? "bg-slate-900 border-slate-800 text-slate-500"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="font-semibold">Low Temp</span>
          </button>

          <button
            onClick={() => setVisibleSeries((prev) => ({ ...prev, average: !prev.average }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              visibleSeries.average
                ? isDark
                  ? "bg-sky-950/40 border-sky-500/40 text-sky-300"
                  : "bg-sky-50 border-sky-300 text-sky-800"
                : isDark
                ? "bg-slate-900 border-slate-800 text-slate-500"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
          >
            <span className="h-0.5 w-3 border-t-2 border-dashed border-sky-400" />
            <span className="font-semibold">Weekly Avg</span>
          </button>
        </div>

        {/* Hover Hint or Active Metric Indicator */}
        <div className="text-xs font-medium">
          {activeDay ? (
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${
              isDark ? "bg-slate-800/90 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-xs"
            }`}>
              <span className="font-bold text-sky-400">{activeDay.dayName}, {activeDay.dateFormatted}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-amber-400">High: {unit === "C" ? activeDay.maxTempC : activeDay.maxTempF}°{unit}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-cyan-400">Low: {unit === "C" ? activeDay.minTempC : activeDay.minTempF}°{unit}</span>
              {activeDay.precipitationMm > 0 && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1 text-sky-400 font-semibold">
                    <CloudRain className="h-3 w-3" />
                    {activeDay.precipitationMm} mm
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
              Hover over graph nodes for daily telemetry details
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        id="d3-weather-canvas-wrap"
        className={`relative w-full rounded-2xl border p-2 sm:p-4 overflow-hidden transition ${
          isDark
            ? "bg-[#0b1224]/90 border-slate-800/90 shadow-inner"
            : "bg-white border-slate-200/90 shadow-xs"
        }`}
      >
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>

      {/* Interactive Selected Day Details Card (when hovered or clicked) */}
      {activeDay && (
        <div
          id="d3-active-day-inspector"
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl border transition-all animate-fade-in ${
            isDark
              ? "bg-[#0d152a] border-sky-500/30 text-slate-200"
              : "bg-sky-50/80 border-sky-200 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
              <Sun className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Condition</p>
              <p className="text-xs font-bold truncate">{activeDay.condition}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-100 text-sky-700"}`}>
              <Thermometer className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Day Average</p>
              <p className="text-xs font-bold">{unit === "C" ? activeDay.avgTempC : activeDay.avgTempF}°{unit}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>
              <CloudRain className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Precipitation</p>
              <p className="text-xs font-bold">{activeDay.precipitationMm > 0 ? `${activeDay.precipitationMm} mm (${activeDay.precipitationProbMax}%)` : "0.0 mm (Dry)"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
              <Wind className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Max Wind</p>
              <p className="text-xs font-bold">{activeDay.windSpeedKmh} km/h</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
