cmake_minimum_required(VERSION 3.16)
project(hefestos LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(hefestos
  src/main.cpp
  src/hefestos.cpp
  src/jsonl.cpp
)

target_include_directories(hefestos PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# iSH/Alpine: compila con clang/g++ estándar.
# Si quieres build estático (cuando sea viable):
# set_target_properties(hefestos PROPERTIES LINK_FLAGS "-static")
