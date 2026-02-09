#pragma once

#include <map>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace hefestos {

struct MELE {
  int M = 4; // Mapa
  int E = 3; // Evidencia
  int L = 4; // Legibilidad
  int Et = 5; // Ética (Et = É)
};

struct NA {
  int I = 1; // Inmediatez
  int E = 1; // Externalidad
  int R = 2; // Reversibilidad
  int K = 2; // Riesgo
};

struct Trace {
  std::string step;
  std::string summary;
  std::map<std::string, std::string> patch;
};

struct Evaluation {
  bool allow = true;
  std::vector<std::string> reasons;
};

struct Context {
  std::string text;
  std::vector<std::string> tokens;
  std::string symbol;
  std::map<std::string, std::string> rhythm;
  std::vector<std::string> protocol;
  MELE mele;
  NA na;
  Evaluation evaluation;
  std::vector<Trace> traces;
};

class Transformer {
public:
  virtual ~Transformer() = default;
  virtual std::string name() const = 0;
  virtual void apply(Context& ctx) = 0;
};

class S1_Attention final : public Transformer {
public:
  std::string name() const override { return "S1_Attention"; }
  void apply(Context& ctx) override;
};

class S2_Symbol final : public Transformer {
public:
  std::string name() const override { return "S2_Symbol"; }
  void apply(Context& ctx) override;
};

class S3_Rhythm final : public Transformer {
public:
  std::string name() const override { return "S3_Rhythm"; }
  void apply(Context& ctx) override;
};

class S4_Protocol final : public Transformer {
public:
  std::string name() const override { return "S4_Protocol"; }
  void apply(Context& ctx) override;
};

class S5_Ethics final : public Transformer {
public:
  std::string name() const override { return "S5_Ethics"; }
  void apply(Context& ctx) override;
};

class PentetraktysMachine {
public:
  PentetraktysMachine();
  void run_cycle(Context& ctx);

private:
  std::vector<std::unique_ptr<Transformer>> chain_;
};

// util
std::string now_iso_utc();
int clamp_int(int x, int lo, int hi);

} // namespace hefestos
