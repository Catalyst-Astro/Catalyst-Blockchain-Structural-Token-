const hre = require("hardhat");

// Script de ejemplo que despliega SymbolicAudit y ejecuta
// eventos válidos e inválidos para mostrar la narrativa de auditoría.
async function main() {
  await hre.run("compile");

  const [owner, validador, otro] = await hre.ethers.getSigners();

  const Audit = await hre.ethers.getContractFactory("SymbolicAudit");
  const audit = await Audit.deploy();
  await audit.deployed();

  // Registrar principios y roles
  await audit.agregarPrincipio("transparencia");
  await audit.setValidador(validador.address, "custodio");
  await audit.setArquetipoParaTipo("ritual", "custodio");

  // Evento que cumple con todos los requisitos
  const eventoValido = {
    tipo: "ritual",
    principio: "transparencia",
    validador: validador.address,
    arquetipo: "custodio",
    timestamp: Math.floor(Date.now() / 1000)
  };
  await (await audit.auditarEvento(eventoValido)).wait();

  // Evento fallido por validador no autorizado
  const eventoInvalido = {
    tipo: "ritual",
    principio: "transparencia",
    validador: otro.address,
    arquetipo: "custodio",
    timestamp: Math.floor(Date.now() / 1000)
  };
  await (await audit.auditarEvento(eventoInvalido)).wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
