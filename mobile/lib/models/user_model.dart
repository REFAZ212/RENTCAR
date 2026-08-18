enum UserRole { supir, admin, petugas }

class UserModel {
  final int id;
  final String name;
  final String email;
  final String? avatar;
  final String? phone;
  final UserRole role;
  final String? token;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.avatar,
    this.phone,
    this.role = UserRole.supir,
    this.token,
  });

  String get initials {
    final parts = name.split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String get roleLabel {
    switch (role) {
      case UserRole.supir:
        return 'Supir';
      case UserRole.admin:
        return 'Admin';
      case UserRole.petugas:
        return 'Petugas';
    }
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      avatar: json['avatar'],
      phone: json['phone'],
      role: UserRole.values.firstWhere(
        (e) => e.name == json['role'],
        orElse: () => UserRole.supir,
      ),
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'avatar': avatar,
        'phone': phone,
        'role': role.name,
        'token': token,
      };
}
