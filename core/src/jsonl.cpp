#include "jsonl.hpp"

#include <filesystem>
#include <fstream>

namespace hefestos {

std::string json_escape(const std::string& s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (char c : s) {
    switch (c) {
      case '\\': out += "\\\\"; break;
      case '"':  out += "\\\""; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default: out += c; break;
    }
  }
  return out;
}

void jsonl_append(const std::string& path, const std::string& line) {
  std::filesystem::path p(path);
  if (p.has_parent_path()) std::filesystem::create_directories(p.parent_path());
  std::ofstream f(path, std::ios::app);
  f << line << "\n";
}

std::vector<std::string> jsonl_tail(const std::string& path, int n) {
  std::vector<std::string> rows;
  std::ifstream f(path);
  if (!f.good()) return rows;
  std::string line;
  while (std::getline(f, line)) {
    if (!line.empty()) rows.push_back(line);
  }
  if (static_cast<int>(rows.size()) <= n) return rows;
  return std::vector<std::string>(rows.end() - n, rows.end());
}

} // namespace hefestos
