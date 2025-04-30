import { useColorMode, Button, IconButton, Tooltip } from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'

export default function ColorModeToggle({ size = 'md' }) {
  const { colorMode, toggleColorMode } = useColorMode()
  
  return (
    <Tooltip label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        aria-label={`Toggle ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
        icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        onClick={toggleColorMode}
        size={size}
        variant="ghost"
        colorScheme="gray"
      />
    </Tooltip>
  )
} 