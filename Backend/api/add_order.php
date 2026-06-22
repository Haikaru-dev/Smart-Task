<?php
require_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->title) && isset($data->price)) {
    $title = $data->title;
    $description = isset($data->description) ? $data->description : '';
    $price = $data->price; // Always use price for calculations

    $stmt = $pdo->prepare("INSERT INTO orders (title, description, price) VALUES (?, ?, ?)");
    if ($stmt->execute([$title, $description, $price])) {
        echo json_encode(['success' => true, 'message' => 'Order added successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add order']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
}
?>
