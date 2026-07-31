import numpy as np


def dtw_distance(first_sequence, second_sequence):
    """두 특징 시퀀스의 길이가 달라도 동작 순서를 맞춰 평균 거리를 계산합니다."""
    first_length = len(first_sequence)
    second_length = len(second_sequence)
    costs = np.full((first_length + 1, second_length + 1), np.inf)
    path_lengths = np.zeros((first_length + 1, second_length + 1), dtype=np.int32)
    costs[0, 0] = 0.0

    for first_index in range(1, first_length + 1):
        for second_index in range(1, second_length + 1):
            candidates = (
                (costs[first_index - 1, second_index], path_lengths[first_index - 1, second_index]),
                (costs[first_index, second_index - 1], path_lengths[first_index, second_index - 1]),
                (costs[first_index - 1, second_index - 1], path_lengths[first_index - 1, second_index - 1]),
            )
            previous_cost, previous_length = min(candidates, key=lambda item: item[0])
            frame_distance = np.sqrt(
                np.mean(
                    (first_sequence[first_index - 1] - second_sequence[second_index - 1]) ** 2
                )
            )
            costs[first_index, second_index] = previous_cost + frame_distance
            path_lengths[first_index, second_index] = previous_length + 1

    return float(costs[first_length, second_length] / path_lengths[first_length, second_length])
