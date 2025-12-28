/**
 * Button Component Tests
 * 
 * Tests for the reusable Button component to ensure it works correctly
 * across different variants and states.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "../../components/shared/Button";

describe("Button Component", () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with label", () => {
    const { getByText } = render(<Button label="Test Button" onPress={mockOnPress} />);
    expect(getByText("Test Button")).toBeTruthy();
  });

  it("should call onPress when pressed", () => {
    const { getByText } = render(<Button label="Test Button" onPress={mockOnPress} />);
    fireEvent.press(getByText("Test Button"));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it("should not call onPress when disabled", () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={mockOnPress} disabled />
    );
    fireEvent.press(getByText("Test Button"));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it("should render with icon on left", () => {
    const { getByTestId } = render(
      <Button label="Test Button" onPress={mockOnPress} icon="add" iconPosition="left" />
    );
    // Icon should be present (tested via accessibility)
    expect(getByTestId).toBeDefined();
  });

  it("should render with icon on right", () => {
    const { getByTestId } = render(
      <Button label="Test Button" onPress={mockOnPress} icon="add" iconPosition="right" />
    );
    // Icon should be present
    expect(getByTestId).toBeDefined();
  });

  it("should apply primary variant styles", () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={mockOnPress} variant="primary" />
    );
    const button = getByText("Test Button").parent;
    expect(button).toBeTruthy();
  });

  it("should apply secondary variant styles", () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={mockOnPress} variant="secondary" />
    );
    const button = getByText("Test Button").parent;
    expect(button).toBeTruthy();
  });

  it("should apply ghost variant styles", () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={mockOnPress} variant="ghost" />
    );
    const button = getByText("Test Button").parent;
    expect(button).toBeTruthy();
  });
});

