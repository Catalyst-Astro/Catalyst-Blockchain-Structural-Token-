import 'package:flutter/material.dart';
import 'arke_service.dart';

void main() {
  runApp(const ArkeApp());
}

class ArkeApp extends StatelessWidget {
  const ArkeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'ARKE OS',
      home: ArkeScreen(),
    );
  }
}

class Message {
  final String role;
  final String content;
  Message(this.role, this.content);
}

class ArkeScreen extends StatefulWidget {
  const ArkeScreen({super.key});

  @override
  State<ArkeScreen> createState() => _ArkeScreenState();
}

class _ArkeScreenState extends State<ArkeScreen> {
  final controller = TextEditingController();
  final service = ArkeService('http://localhost:8000');
  final List<Message> messages = [];

  Future<void> procesar() async {
    final texto = controller.text;
    if (texto.isEmpty) return;
    setState(() {
      messages.add(Message('user', texto));
    });
    controller.clear();
    final respuesta = await service.generarTexto(texto, 'simbolico');
    setState(() {
      messages.add(Message('assistant', respuesta));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ARKE OS - Chat')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                final isUser = msg.role == 'user';
                final alignment =
                    isUser ? Alignment.centerRight : Alignment.centerLeft;
                final color = isUser
                    ? Colors.green[100]
                    : Colors.grey[300];
                return Align(
                  alignment: alignment,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(msg.content),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controller,
                    minLines: 1,
                    maxLines: 5,
                    decoration:
                        const InputDecoration(hintText: 'Escribe tu mensaje'),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: procesar,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
