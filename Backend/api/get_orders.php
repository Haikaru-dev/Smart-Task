<?php
require_once 'db.php';

$stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($orders);
?>
