"""UnionPay QR Payment — Binary Chinese ASCII Encoder"""
import hashlib

cn = {
    'YinLian (UnionPay)':     '银联',
    'ZhiFu (Payment)':        '支付',
    'ChengGong (Success)':    '成功',
    'JiaoYi (Transaction)':   '交易',
    'ErWeiMa (QR Code)':      '二维码',
    'ShangHu (Merchant)':     '商户',
    'QueRen (Confirm)':       '确认',
    'ZhuCe (Register)':       '注册',
}

output = []
output.append("=" * 64)
output.append("BINARY CHINESE ASCII — UNIONPAY QR 95516 PAYMENT")
output.append("=" * 64)
output.append("")

for name, text in cn.items():
    b = text.encode('utf-8')
    bits = ' '.join(format(byte, '08b') for byte in b)
    output.append(name)
    output.append(f"  CHAR: {text}")
    output.append(f"  UTF8: {b.hex()}")
    output.append(f"  BIN:  {bits}")
    output.append("")

# Full transaction
msg = "UnionPay:100000CNY->145700CAT:SUCCESS"
msg_b = msg.encode('utf-8')
msg_bin = ' '.join(format(b, '08b') for b in msg_b)

output.append("--- FULL TX ---")
output.append(f"ASCII: {msg}")
output.append(f"HEX:   {msg_b.hex()}")
output.append(f"BIN:   {msg_bin}")
output.append("")
output.append(f"SHA-256: {hashlib.sha256(msg_b).hexdigest()}")
output.append("=" * 64)

# Write to file
with open('unionpay_binary_chinese.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Written to unionpay_binary_chinese.txt")
print(f"File contains {len(cn)} Chinese characters in binary UTF-8")
print()
# Print ASCII-safe summary
for line in output:
    if 'CHAR:' in line:
        # Replace Chinese chars with [encoded] for terminal safety
        parts = line.split('CHAR: ')
        hex_part = parts[1].encode('utf-8').hex()
        print(f"{parts[0]}HEX: {hex_part}")
    else:
        print(line)
