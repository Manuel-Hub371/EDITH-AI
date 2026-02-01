import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _usernameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _usernameController.text = user?.username ?? '';
  }

  void _updateProfile() async {
    try {
      await Provider.of<AuthProvider>(context, listen: false).updateProfile(
        username: _usernameController.text,
      );
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Profile Updated")));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  void _logout() {
    Provider.of<AuthProvider>(context, listen: false).logout();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Settings"),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // User Info Section
            Container(
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).cardTheme.color,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                     radius: 40,
                     backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                     child: Icon(Icons.person, size: 40, color: Theme.of(context).colorScheme.primary),
                  ),
                  SizedBox(height: 20),
                  TextField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                        labelText: "Username",
                        suffixIcon: IconButton(
                            icon: Icon(Icons.save, color: Theme.of(context).colorScheme.primary),
                            onPressed: _updateProfile,
                        )
                    ),
                  ),
                ],
              ),
            ),
            
            SizedBox(height: 30),

            // Settings 
            Consumer<AuthProvider>(
                builder: (ctx, auth, _) => ListTile(
                    title: Text("Dark Theme", style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color)),
                    trailing: Switch(
                        value: auth.isDarkMode,
                        activeColor: Theme.of(context).colorScheme.primary,
                        onChanged: (val) {
                            auth.toggleTheme(val);
                        },
                    ),
                ),
            ),
            
            Spacer(),

            // Logout
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.withOpacity(0.1),
                        foregroundColor: Colors.red,
                        padding: EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))
                    ),
                    onPressed: _logout,
                    child: Text("LOGOUT"),
                ),
            )
          ],
        ),
      ),
    );
  }
}
