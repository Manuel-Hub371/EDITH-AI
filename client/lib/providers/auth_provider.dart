import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  bool _faceLoginEnabled = false;
  bool _isDarkMode = true;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  bool get faceLoginEnabled => _faceLoginEnabled;
  bool get isDarkMode => _isDarkMode;

  Future<void> setFaceLogin(bool enabled) async {
    _faceLoginEnabled = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('faceLoginEnabled', enabled);
    notifyListeners();
  }

  Future<void> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    _faceLoginEnabled = prefs.getBool('faceLoginEnabled') ?? false;
    _isDarkMode = prefs.getBool('isDarkMode') ?? true;
    notifyListeners();
  }

  Future<void> toggleTheme(bool isDark) async {
    _isDarkMode = isDark;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDarkMode', isDark);
    notifyListeners();
    
    // If logged in, sync with backend
    if (_user != null) {
        try {
            await updateProfile(preferences: {'theme': isDark ? 'dark' : 'light'});
        } catch (_) {}
    }
  }

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await ApiService.post('/auth/login', {
        'email': email,
        'password': password,
      });

      _user = User.fromJson(data);
      await _saveToken(data['token']);
      await _checkAndApplyPreferences();
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> register(String username, String email, String password, {String? faceData}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await ApiService.post('/auth/register', {
        'username': username,
        'email': email,
        'password': password,
        'faceData': faceData,
      });

      _user = User.fromJson(data);
      await _saveToken(data['token']);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> faceLogin(String faceData) async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await ApiService.post('/auth/face-login', {
        'faceData': faceData,
      });

      _user = User.fromJson(data);
      await _saveToken(data['token']);
      await _checkAndApplyPreferences();
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> _checkAndApplyPreferences() async {
     if (_user != null && _user!.preferences != null) {
         if (_user!.preferences!.containsKey('theme')) {
             _isDarkMode = _user!.preferences!['theme'] == 'dark';
             final prefs = await SharedPreferences.getInstance();
             await prefs.setBool('isDarkMode', _isDarkMode);
             notifyListeners();
         }
     }
  }

  Future<void> updateProfile({String? username, Map<String, dynamic>? preferences}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final body = <String, dynamic>{};
      if (username != null) body['username'] = username;
      if (preferences != null) body['preferences'] = preferences;

      final data = await ApiService.put('/user/profile', body);

      // Update local user
      if (_user != null) {
          _user = User(
              id: _user!.id,
              username: data['username'],
              email: _user!.email,
              preferences: data['preferences'],
              token: _user!.token,
          );
      }
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey('token')) {
      return false;
    }
    
    final token = prefs.getString('token')!;
    
    try {
      final data = await ApiService.get('/user/profile');
      
      _user = User(
        id: data['_id'],
        username: data['username'],
        email: data['email'],
        preferences: data['preferences'],
        token: token,
      );
      
      await _checkAndApplyPreferences();
      
      notifyListeners();
      return true;
    } catch (e) {
      // Token invalid or network error
      await logout();
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    notifyListeners();
  }

  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }
}
