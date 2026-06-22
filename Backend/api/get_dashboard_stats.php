<?php
require_once 'db.php';

// Total orders
$stmt1 = $pdo->query("SELECT COUNT(*) as total_orders FROM orders");
$total_orders = $stmt1->fetch(PDO::FETCH_ASSOC)['total_orders'];

// Total revenue (using price)
$stmt2 = $pdo->query("SELECT SUM(price) as total_revenue FROM orders WHERE status = 'completed'");
$total_revenue = $stmt2->fetch(PDO::FETCH_ASSOC)['total_revenue'];

// Pending orders
$stmt3 = $pdo->query("SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'pending'");
$pending_orders = $stmt3->fetch(PDO::FETCH_ASSOC)['pending_orders'];

echo json_encode([
    'total_orders' => $total_orders,
    'total_revenue' => $total_revenue ? $total_revenue : 0,
    'pending_orders' => $pending_orders
]);
?>
