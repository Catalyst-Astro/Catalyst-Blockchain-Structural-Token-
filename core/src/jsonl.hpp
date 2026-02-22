#pragma once

#include <string>
#include <vector>

namespace hefestos {

// JSONL minimalista: escribimos líneas JSON a mano para evitar deps.
// El contenido está pensado para consumo por la GUI (renderer).

void jsonl_append(const std::string& path, const std::string& line);
std::vector<std::string> jsonl_tail(const std::string& path, int n = 20);

std::string json_escape(const std::string& s);

} // namespace hefestos
