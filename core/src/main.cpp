#include "hefestos.hpp"
#include "jsonl.hpp"

#include <iostream>
#include <string>
#include <vector>

using namespace hefestos;

static void print_help() {
  std::cout
    << "hefestos (BAE 1.1.0)\n"
    << "Usage:\n"
    << "  hefestos run --text <text> [--cycles N] [--jsonl path] [--na-I n --na-E n --na-R n --na-K n] [--m-M n --m-E n --m-L n --m-Et n]\n"
    << "  hefestos tui [--jsonl path]\n";
}

static bool has_arg(const std::vector<std::string>& a, const std::string& k) {
  for (auto& x : a) if (x == k) return true;
  return false;
}

static std::string get_opt(const std::vector<std::string>& a, const std::string& k, const std::string& def = "") {
  for (size_t i = 0; i + 1 < a.size(); i++) if (a[i] == k) return a[i + 1];
  return def;
}

static int get_opt_int(const std::vector<std::string>& a, const std::string& k, int def) {
  auto s = get_opt(a, k, "");
  if (s.empty()) return def;
  try { return std::stoi(s); } catch (...) { return def; }
}

static int cmd_run(const std::vector<std::string>& args) {
  if (!has_arg(args, "--text")) {
    std::cerr << "Missing required: --text\n";
    return 2;
  }

  Context ctx{get_opt(args, "--text")};
  ctx.na.I = clamp_int(get_opt_int(args, "--na-I", 1), 0, 5);
  ctx.na.E = clamp_int(get_opt_int(args, "--na-E", 1), 0, 5);
  ctx.na.R = clamp_int(get_opt_int(args, "--na-R", 2), 0, 5);
  ctx.na.K = clamp_int(get_opt_int(args, "--na-K", 2), 0, 5);

  ctx.mele.M  = clamp_int(get_opt_int(args, "--m-M", 4), 1, 5);
  ctx.mele.E  = clamp_int(get_opt_int(args, "--m-E", 3), 1, 5);
  ctx.mele.L  = clamp_int(get_opt_int(args, "--m-L", 4), 1, 5);
  ctx.mele.Et = clamp_int(get_opt_int(args, "--m-Et", 5), 1, 5);

  int cycles = clamp_int(get_opt_int(args, "--cycles", 1), 1, 100);
  std::string jsonl = get_opt(args, "--jsonl", "");

  PentetraktysMachine machine;

  int executed = 0;
  for (int i = 0; i < cycles; i++) {
    machine.run_cycle(ctx);
    executed++;

    // persistencia
    if (!jsonl.empty()) {
      std::string line;
      line += "{";
      line += "\"type\":\"hefestos_run\",";
      line += "\"ts\":\"" + json_escape(now_iso_utc()) + "\",";
      line += "\"cycle\":" + std::to_string(i + 1) + ",";
      line += "\"symbol\":\"" + json_escape(ctx.symbol) + "\",";
      line += "\"allow\":" + std::string(ctx.evaluation.allow ? "true" : "false") + ",";
      line += "\"text\":\"" + json_escape(ctx.text) + "\"";
      line += "}";
      jsonl_append(jsonl, line);
    }

    if (!ctx.evaluation.allow) break;
    ctx.text = ctx.symbol + " :: " + ctx.text;
  }

  std::cout << "HEFESTOS/BAE 1.1.0 — RESULT\n";
  std::cout << "cycles_executed=" << executed << "\n";
  std::cout << "symbol=" << ctx.symbol << "\n";
  std::cout << "allow=" << (ctx.evaluation.allow ? "true" : "false") << "\n";
  if (!ctx.evaluation.reasons.empty()) {
    std::cout << "reasons:\n";
    for (auto& r : ctx.evaluation.reasons) std::cout << " - " << r << "\n";
  }
  std::cout << "protocol:\n";
  for (auto& p : ctx.protocol) std::cout << " - " << p << "\n";

  if (!jsonl.empty()) std::cout << "\ntrace_jsonl=" << jsonl << "\n";
  return 0;
}

static int cmd_tui(const std::vector<std::string>& args) {
  std::string jsonl = get_opt(args, "--jsonl", "");
  PentetraktysMachine machine;

  std::cout << "Hefestos TUI — Commands: run <text> | tail | exit\n";

  for (;;) {
    std::cout << "hefestos> " << std::flush;
    std::string line;
    if (!std::getline(std::cin, line)) return 0;
    if (line == "exit") return 0;
    if (line == "tail") {
      if (jsonl.empty()) {
        std::cout << "No JSONL path. Use: tui --jsonl ./state/runs.jsonl\n";
        continue;
      }
      auto rows = jsonl_tail(jsonl, 10);
      for (auto& r : rows) std::cout << r << "\n";
      continue;
    }
    if (line.rfind("run ", 0) == 0) {
      std::string text = line.substr(4);
      Context ctx{text};
      machine.run_cycle(ctx);
      std::cout << "symbol=" << ctx.symbol << " allow=" << (ctx.evaluation.allow ? "true" : "false") << "\n";
      if (!jsonl.empty()) {
        std::string jl = "{";
        jl += "\"type\":\"hefestos_tui\",";
        jl += "\"ts\":\"" + json_escape(now_iso_utc()) + "\",";
        jl += "\"cycle\":1,";
        jl += "\"symbol\":\"" + json_escape(ctx.symbol) + "\",";
        jl += "\"allow\":" + std::string(ctx.evaluation.allow ? "true" : "false") + ",";
        jl += "\"text\":\"" + json_escape(ctx.text) + "\"";
        jl += "}";
        jsonl_append(jsonl, jl);
      }
      continue;
    }

    std::cout << "Unknown. Use: run <text> | tail | exit\n";
  }
}

int main(int argc, char** argv) {
  std::vector<std::string> args;
  for (int i = 1; i < argc; i++) args.push_back(argv[i]);

  // Fix equivalente al de Python: si no hay args, entrar a tui.
  if (args.empty()) return cmd_tui(args);

  if (args[0] == "--help" || args[0] == "-h") { print_help(); return 0; }

  const std::string cmd = args[0];
  std::vector<std::string> rest(args.begin() + 1, args.end());

  if (cmd == "run") return cmd_run(rest);
  if (cmd == "tui") return cmd_tui(rest);

  print_help();
  return 0;
}
