<?php
// Recibe el formulario de contratación y lo envía por correo (Hostinger soporta mail()).
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); exit; }
if (!empty($_POST['web'])) { echo json_encode(['ok'=>true]); exit; } // honeypot anti-spam
$to = 'yomellamomarcanthony2017@gmail.com';
$c = fn($k) => trim(strip_tags(substr($_POST[$k] ?? '', 0, 2000)));
$nombre=$c('nombre'); $email=filter_var($c('email'), FILTER_VALIDATE_EMAIL); $tel=$c('telefono');
if (!$nombre || !$email || !$tel) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Faltan datos']); exit; }
$campos = ['nombre'=>'Nombre','empresa'=>'Empresa','telefono'=>'Teléfono','email'=>'Correo','tipo'=>'Tipo de evento','formato'=>'Formato','fecha'=>'Fecha','ciudad'=>'Ciudad','aforo'=>'Aforo','sonido'=>'Sonido','mensaje'=>'Mensaje'];
$body = "Nueva solicitud de contratación desde la web\n\n";
foreach ($campos as $k=>$l) $body .= "$l: ".$c($k)."\n";
$body .= "\nIP: ".($_SERVER['REMOTE_ADDR'] ?? '')."\n";
$subject = '=?UTF-8?B?'.base64_encode('Cotización: '.$c('tipo').' — '.$c('ciudad').' ('.$c('fecha').')').'?=';
$host = preg_replace('/^www\./','',$_SERVER['HTTP_HOST'] ?? 'localhost');
$headers = "From: Web <no-reply@$host>\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";
$ok = @mail($to, $subject, $body, $headers);
http_response_code($ok ? 200 : 500);
echo json_encode(['ok'=>$ok]);
