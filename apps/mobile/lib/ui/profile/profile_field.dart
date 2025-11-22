import 'package:flutter/material.dart';

class ProfileField extends StatefulWidget {
  const ProfileField({
    super.key,
    required this.label,
    required this.value,
    required this.onSubmit,
  });

  final String label;
  final String? value;
  final Future<void> Function(String) onSubmit;

  @override
  State<ProfileField> createState() => _ProfileFieldState();
}

class _ProfileFieldState extends State<ProfileField> {
  bool editing = false;
  bool saving = false;
  late TextEditingController ctrl;

  @override
  void initState() {
    super.initState();
    ctrl = TextEditingController(text: widget.value ?? '');
  }

  Future<void> save() async {
    final text = ctrl.text.trim();
    setState(() => saving = true);
    await widget.onSubmit(text);
    setState(() {
      saving = false;
      editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!editing) {
      return InkWell(
        onTap: () => setState(() => editing = true),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              Text(
                widget.label,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Text(widget.value ?? '—'),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: ctrl,
              autofocus: true,
              onSubmitted: (_) => save(),
            ),
          ),
          const SizedBox(width: 8),
          if (saving)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.check),
                  onPressed: save,
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() {
                    editing = false;
                    ctrl.text = widget.value ?? '';
                  }),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
