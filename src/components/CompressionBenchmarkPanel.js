import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell,
} from 'recharts';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

// Real benchmark results from server/scripts/compression_benchmark_ttc.py and
// compression_benchmark_ttc_longcontext.py — actual Anthropic API usage.input_tokens from real
// runs against this app's production prompts (Housing Agent's verified-ACS-census prompt, and the
// Ask UrbanPilot AI long-context prompt), not estimated or fabricated numbers. Site: Downtown
// Berkeley, CA. Quality check on every leg: output still parsed as valid structured JSON (or, for
// the long-context test, still cited the real verified figures from the source data) — compression
// did not degrade downstream output in any tested case.
const STRUCTURED_PROMPT_DATA = [
  { name: 'Original', tokens: 924, reduction: 0, fill: '#64748b' },
  { name: 'Our Compression', tokens: 730, reduction: 21.0, fill: '#34d399' },
  { name: 'the-token-company', tokens: 888, reduction: 3.9, fill: '#818cf8' },
];

const LONG_CONTEXT_DATA = [
  { name: 'Raw', tokens: 4757, reduction: 0, fill: '#64748b' },
  { name: 'the-token-company', tokens: 3775, reduction: 20.6, fill: '#818cf8' },
];

function ReductionLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 8} textAnchor="middle" className="fill-emerald-400 text-[11px] font-semibold">
      -{value.toFixed(1)}%
    </text>
  );
}

function BenchmarkChart({ title, subtitle, data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} label={{ value: 'input tokens', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value, key, { payload }) => [`${value} tokens${payload.reduction ? ` (-${payload.reduction}%)` : ''}`, 'Input tokens']}
            />
            <Bar dataKey="tokens" radius={[6, 6, 0, 0]}>
              {data.map(d => <Cell key={d.name} fill={d.fill} />)}
              <LabelList dataKey="reduction" content={ReductionLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function StatCallout({ value, label, tone }) {
  return (
    <div className="flex-1 bg-slate-800/50 border border-slate-700/60 rounded-lg px-4 py-3 text-center">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

export default function CompressionBenchmarkPanel() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[2000] flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full px-4 py-2.5 shadow-lg shadow-violet-900/40 transition-colors">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-semibold">Compression Benchmark</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Token Compression Benchmark</span>
            <Badge tone="violet">The Token Company Challenge</Badge>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Real Anthropic API token usage (<code className="text-slate-300">response.usage.input_tokens</code>) measured against
            UrbanPilot&apos;s actual production prompts for Downtown Berkeley — not estimated, not synthetic. Two test shapes:
            a tight, information-dense JSON-schema generation prompt (Housing Agent), and a long, prose-heavy context prompt
            (Ask UrbanPilot AI). Every compressed leg was checked for preserved quality before being counted as a win.
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            <StatCallout value="21.0%" label="Our custom compression — structured JSON prompt" tone="text-emerald-400" />
            <StatCallout value="3.9%" label="the-token-company — structured JSON prompt" tone="text-violet-400" />
            <StatCallout value="20.6%" label="the-token-company — long-context prompt" tone="text-violet-400" />
          </div>

          <BenchmarkChart
            title="Structured JSON-schema prompt (Housing Agent)"
            subtitle="Verified ACS census data + production response schema · 924 input tokens baseline"
            data={STRUCTURED_PROMPT_DATA}
          />
          <BenchmarkChart
            title="Long, prose-heavy context prompt (Ask UrbanPilot AI)"
            subtitle="Full findings/risks/recommendations across all 4 agents · 4,757 input tokens baseline"
            data={LONG_CONTEXT_DATA}
          />

          <Card>
            <CardHeader><CardTitle>Quality preserved on every leg</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {[
                  'Structured prompt: output still parsed as valid JSON (original, our compression, and TTC)',
                  'Structured prompt: verified Census figures ($65,238 income, $1,719 rent) still cited exactly in all three',
                  'Long-context prompt: both raw and TTC-compressed answers cited specific real figures, risk severities, and scenario details — no hallucination observed',
                ].map(line => (
                  <li key={line} className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <p className="text-[10px] text-slate-500 leading-relaxed italic">
            Takeaway: general-purpose compression scales with redundancy — the-token-company did ~5x better on the long,
            repetitive prose context than on the tight JSON schema, as expected. But even on its best-case input here, it fell
            short of its marketed 50% reduction, and a trivial domain-aware encoding trick matched or beat it on the structured
            case with zero ML involved.
          </p>
        </div>
      </div>
    </div>
  );
}
