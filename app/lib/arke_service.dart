import 'dart:convert';
import 'package:http/http.dart' as http;

class ArkeService {
  final String baseUrl;
  ArkeService(this.baseUrl);

  Future<String> generarTexto(String prompt, String tono) async {
    final url = Uri.parse('$baseUrl/arke/generar');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'mensaje': prompt, 'tono': tono}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['respuesta'] as String;
    } else {
      throw Exception('Fallo ético en manifestación');
    }
  }
}
