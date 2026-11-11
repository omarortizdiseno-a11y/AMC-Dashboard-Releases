<?php
// Aviso por correo cuando un visitante abre WhatsApp desde la web.
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$to = 'contacto@yomellamomarcanthony.com';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
// máximo un aviso por visitante cada 10 minutos
$lock = sys_get_temp_dir().'/wa_'.md5($ip);
if (is_file($lock) && time() - filemtime($lock) < 600) { echo '{"ok":true}'; exit; }
@touch($lock);
$c = fn($k) => trim(strip_tags(substr($_POST[$k] ?? '', 0, 200)));
date_default_timezone_set('America/Bogota');
$body = "Alguien tocó el botón de WhatsApp en la web.\n\n"
  ."Fecha y hora: ".date('Y-m-d H:i')."\n"
  ."Página: ".$c('pagina')."\n"
  ."Botón: ".$c('boton')."\n"
  ."Llegó desde: ".($c('ref') ?: 'directo')."\n"
  ."Dispositivo: ".substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200)."\n\n"
  ."El mensaje de WhatsApp empieza con \"Mensaje desde la web yomellamomarcanthony.com\". Si no llega en unos minutos, la persona pudo no enviarlo.\n";
$subject = '=?UTF-8?B?'.base64_encode('WhatsApp desde la web — '.date('d/m H:i')).'?=';
$host = preg_replace('/^www\./','',$_SERVER['HTTP_HOST'] ?? 'localhost');
$headers = "From: Web <no-reply@$host>\r\nContent-Type: text/plain; charset=UTF-8\r\n";
$ok = @mail($to, $subject, $body, $headers);
echo json_encode(['ok'=>$ok]);
