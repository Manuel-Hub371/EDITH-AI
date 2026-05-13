import 'package:file_picker/file_picker.dart';

Future<String?> pickImageImpl() async {
  try {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      allowMultiple: false,
    );
    return result?.files.single.name;
  } catch (_) {
    return null;
  }
}

Future<String?> pickFileImpl() async {
  try {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'json'],
      allowMultiple: false,
    );
    return result?.files.single.name;
  } catch (_) {
    return null;
  }
}
