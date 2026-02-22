#include "hefestos.hpp"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cmath>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace hefestos {

static void add_trace(Context& ctx, const std::string& step, const std::string& summary,
                      const std::map<std::string, std::string>& patch = {}) {
  ctx.traces.push_back(Trace{step, summary, patch});
}

int clamp_int(int x, int lo, int hi) {
  return std::max(lo, std::min(hi, x));
}

std::string now_iso_utc() {
  using namespace std::chrono;
  auto now = system_clock::now();
  std::time_t t = system_clock::to_time_t(now);
  std::tm gmt{};
#if defined(_WIN32)
  gmtime_s(&gmt, &t);
#else
  gmtime_r(&t, &gmt);
#endif
  std::ostringstream oss;
  oss << std::put_time(&gmt, "%Y-%m-%dT%H:%M:%SZ");
  return oss.str();
}

static std::string trim_punct(std::string s) {
  const std::string punct = ".,;:!?()[]{}\"'“”‘’";
  auto l = s.find_first_not_of(punct);
  auto r = s.find_last_not_of(punct);
  if (l == std::string::npos) return "";
  s = s.substr(l, r - l + 1);
  std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c){ return static_cast<char>(std::tolower(c)); });
  return s;
}

void S1_Attention::apply(Context& ctx) {
  ctx.tokens.clear();
  std::string s = ctx.text;
  for (char& c : s) if (c == '\n') c = ' ';

  std::string cur;
  for (char ch : s) {
    if (std::isspace(static_cast<unsigned char>(ch))) {
      if (!cur.empty()) {
        auto t = trim_punct(cur);
        if (!t.empty()) ctx.tokens.push_back(t);
        cur.clear();
      }
    } else {
      cur.push_back(ch);
    }
  }
  if (!cur.empty()) {
    auto t = trim_punct(cur);
    if (!t.empty()) ctx.tokens.push_back(t);
  }

  add_trace(ctx, name(), "Tokenización: " + std::to_string(ctx.tokens.size()) + " tokens");
}

void S2_Symbol::apply(Context& ctx) {
  std::string core;
  if (!ctx.tokens.empty()) {
    size_t take = std::min<size_t>(12, ctx.tokens.size());
    for (size_t i = 0; i < take; i++) {
      if (i) core += " ";
      core += ctx.tokens[i];
    }
  } else {
    core = ctx.text.substr(0, std::min<size_t>(64, ctx.text.size()));
  }

  // hash corto reproducible (no cripto): suma ponderada
  uint32_t acc = 0;
  for (size_t i = 0; i < core.size(); i++) {
    acc = (acc + static_cast<uint32_t>(i + 1) * static_cast<unsigned char>(core[i])) % 65536;
  }
  std::ostringstream oss;
  oss << "SIG-" << std::hex << std::setw(4) << std::setfill('0') << (acc & 0xFFFF);
  ctx.symbol = oss.str();

  add_trace(ctx, name(), "Reducción simbólica: " + ctx.symbol);
}

void S3_Rhythm::apply(Context& ctx) {
  int n = static_cast<int>(std::max<size_t>(1, ctx.tokens.size()));
  // minutos = 12 - log_{1.6}(n+1) clamped 3..10
  double denom = std::log(1.6);
  int minutes = 12 - static_cast<int>(std::floor(std::log(static_cast<double>(n + 1)) / denom));
  minutes = clamp_int(minutes, 3, 10);

  ctx.rhythm["minutes"] = std::to_string(minutes);
  ctx.rhythm["one_technique"] = "true";
  ctx.rhythm["closure_required"] = "true";

  add_trace(ctx, name(), "Ritmo: " + std::to_string(minutes) + " min, 1 técnica");
}

void S4_Protocol::apply(Context& ctx) {
  ctx.protocol = {
    "(1) Hipótesis (1 frase) — qué cambia y cómo lo mediré",
    "(2) Operación (≤ minutos definidos) — una técnica, sin terceros",
    "(3) Registro — variables fijas (foco/retorno/reactividad)",
    "(4) Contraste — A/B o temporal",
    "(5) Clausura — declarar fin, guardar bitácora",
  };
  add_trace(ctx, name(), "Protocolo de 5 pasos generado");
}

void S5_Ethics::apply(Context& ctx) {
  ctx.evaluation.allow = true;
  ctx.evaluation.reasons.clear();

  if (ctx.na.E >= 3) {
    ctx.evaluation.allow = false;
    ctx.evaluation.reasons.push_back("Externalidad alta: el sistema debe permanecer intrapersonal");
  }
  if (ctx.na.K >= 3) {
    ctx.evaluation.allow = false;
    ctx.evaluation.reasons.push_back("Riesgo alto: requiere reducción de alcance");
  }
  if (ctx.mele.Et <= 3) {
    ctx.evaluation.allow = false;
    ctx.evaluation.reasons.push_back("Ética editorial insuficiente (É<=3)");
  }

  add_trace(ctx, name(), "Evaluación ética aplicada");
}

PentetraktysMachine::PentetraktysMachine() {
  chain_.push_back(std::make_unique<S1_Attention>());
  chain_.push_back(std::make_unique<S2_Symbol>());
  chain_.push_back(std::make_unique<S3_Rhythm>());
  chain_.push_back(std::make_unique<S4_Protocol>());
  chain_.push_back(std::make_unique<S5_Ethics>());
}

void PentetraktysMachine::run_cycle(Context& ctx) {
  for (auto& tr : chain_) tr->apply(ctx);
}

} // namespace hefestos
