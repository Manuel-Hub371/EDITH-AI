// ignore: unused_import
import 'package:flutter/foundation.dart';

// Conditionally import file_picker
import 'file_picker_stub.dart'
    if (dart.library.io) 'file_picker_native.dart'
    if (dart.library.html) 'file_picker_web.dart';

/// Cross-platform file picker helper.
/// Returns the file name on success, null if cancelled.
class FilePickerHelper {
  static Future<String?> pickImage() => pickImageImpl();
  static Future<String?> pickFile() => pickFileImpl();
}
