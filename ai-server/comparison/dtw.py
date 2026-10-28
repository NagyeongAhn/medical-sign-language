import numpy as np


def dtw_distance(first_sequence, second_sequence):
    """두 특징 시퀀스의 길이가 달라도 동작 순서를 맞춰 평균 거리를 계산합니다."""
    first_length = len(first_sequence)
    second_length = len(second_sequence)
    feature_count = first_sequence.shape[1]
    first_squared = np.sum(first_sequence * first_sequence, axis=1)
    second_squared = np.sum(second_sequence * second_sequence, axis=1)
    squared_distances = (
        first_squared[:, None]
        + second_squared[None, :]
        - 2 * first_sequence @ second_sequence.T
    )
    frame_distances = np.sqrt(np.maximum(squared_distances, 0) / feature_count)
    previous_costs = [float("inf")] * (second_length + 1)
    previous_lengths = [0] * (second_length + 1)
    previous_costs[0] = 0.0

    for distance_row in frame_distances.tolist():
        current_costs = [float("inf")] * (second_length + 1)
        current_lengths = [0] * (second_length + 1)
        for second_index, frame_distance in enumerate(distance_row, start=1):
            previous_cost = previous_costs[second_index]
            previous_length = previous_lengths[second_index]
            if current_costs[second_index - 1] < previous_cost:
                previous_cost = current_costs[second_index - 1]
                previous_length = current_lengths[second_index - 1]
            if previous_costs[second_index - 1] < previous_cost:
                previous_cost = previous_costs[second_index - 1]
                previous_length = previous_lengths[second_index - 1]
            current_costs[second_index] = previous_cost + frame_distance
            current_lengths[second_index] = previous_length + 1
        previous_costs = current_costs
        previous_lengths = current_lengths

    return previous_costs[second_length] / previous_lengths[second_length]
