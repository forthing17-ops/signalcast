import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PreferencesLayout } from '../../../components/preferences/preferences-layout'

// Mock all the section components
vi.mock('../../../components/preferences/profile-section', () => ({
  ProfileSection: ({ onUnsavedChanges }: { onUnsavedChanges: (hasChanges: boolean) => void }) => {
    return (
      <div data-testid="profile-section">
        <button onClick={() => onUnsavedChanges(true)}>Make Profile Change</button>
      </div>
    )
  },
}))

vi.mock('../../../components/preferences/interests-section', () => ({
  InterestsSection: ({ onUnsavedChanges }: { onUnsavedChanges: (hasChanges: boolean) => void }) => {
    return (
      <div data-testid="interests-section">
        <button onClick={() => onUnsavedChanges(true)}>Make Interests Change</button>
      </div>
    )
  },
}))

vi.mock('../../../components/preferences/delivery-section', () => ({
  DeliverySection: ({ onUnsavedChanges }: { onUnsavedChanges: (hasChanges: boolean) => void }) => {
    return (
      <div data-testid="delivery-section">
        <button onClick={() => onUnsavedChanges(true)}>Make Delivery Change</button>
      </div>
    )
  },
}))

vi.mock('../../../components/preferences/sources-section', () => ({
  SourcesSection: ({ onUnsavedChanges }: { onUnsavedChanges: (hasChanges: boolean) => void }) => {
    return (
      <div data-testid="sources-section">
        <button onClick={() => onUnsavedChanges(true)}>Make Sources Change</button>
      </div>
    )
  },
}))

vi.mock('../../../components/preferences/history-section', () => ({
  HistorySection: () => <div data-testid="history-section">History Section</div>,
}))

vi.mock('../../../components/preferences/import-export-section', () => ({
  ImportExportSection: () => <div data-testid="import-export-section">Import/Export Section</div>,
}))

describe('PreferencesLayout', () => {
  it('renders all tab navigation items', () => {
    render(<PreferencesLayout />)

    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /interests/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /delivery/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sources/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /import.*export/i })).toBeInTheDocument()
  })

  it('displays breadcrumb navigation', () => {
    render(<PreferencesLayout />)

    // Check breadcrumb navigation specifically
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveTextContent('Dashboard')
    expect(nav).toHaveTextContent('Preferences')
    expect(nav).toHaveTextContent('Profile') // default active tab in breadcrumb
  })

  it('renders default profile section', () => {
    render(<PreferencesLayout />)

    // Default should show profile section
    expect(screen.getByTestId('profile-section')).toBeInTheDocument()
    
    // Profile tab should be active by default
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    expect(profileTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows unsaved changes indicator when changes are made', () => {
    render(<PreferencesLayout />)

    // Initially no unsaved changes indicator
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()

    // Make a change in profile section
    const profileChangeButton = screen.getByText('Make Profile Change')
    fireEvent.click(profileChangeButton)

    // Should now show unsaved changes indicator
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
  })

  it('displays default Profile in breadcrumb', () => {
    render(<PreferencesLayout />)

    const nav = screen.getByRole('navigation')
    
    // Initially shows Profile in breadcrumb
    expect(nav).toHaveTextContent('Profile')
  })

  it('shows appropriate section description for profile', () => {
    render(<PreferencesLayout />)

    // Profile section description should be shown by default
    expect(screen.getByText(/professional context and role information/i)).toBeInTheDocument()
  })
})