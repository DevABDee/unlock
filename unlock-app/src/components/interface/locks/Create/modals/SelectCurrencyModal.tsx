import { Dialog, Transition } from '@headlessui/react'
import { Token } from '@unlock-protocol/types'
import { Button, Input } from '@unlock-protocol/ui'
import { Fragment, useEffect, useState } from 'react'
import { useDebounce } from 'react-use'
import { ethers, utils } from 'ethers'
import { useConfig } from '~/utils/withConfig'
import { CryptoIcon } from '../../elements/KeyPrice'
import { addressMinify } from '~/utils/strings'
import { useQuery } from '@tanstack/react-query'
import { useWeb3Service } from '~/utils/withWeb3Service'
import { useForm } from 'react-hook-form'
interface SelectCurrencyModalProps {
  isOpen: boolean
  setIsOpen: (status: boolean) => void
  network: number
  onSelect: (token: Token) => void
  defaultCurrency: string
}

export const ZERO = ethers.constants.AddressZero

export const SelectCurrencyModal = ({
  isOpen,
  setIsOpen,
  network,
  onSelect,
  defaultCurrency,
}: SelectCurrencyModalProps) => {
  const { networks } = useConfig()
  const web3Service = useWeb3Service()
  const [contractAddress, setContractAddress] = useState<string>('')
  const [query, setQuery] = useState('')
  const [_isReady] = useDebounce(
    () => {
      setQuery(query)
      try {
        const address = utils.getAddress(query)
        setContractAddress(address)
      } catch (err: any) {
        setContractAddress('')
        console.error('Error: ', err)
      }
    },
    500,
    [query]
  )
  const { tokens: tokenItems = [] } = networks[network!] || {}
  const [tokens, setTokens] = useState<Token[]>([])

  const { register, resetField } = useForm({
    mode: 'onChange',
    defaultValues: {
      query: '',
    },
  })

  useEffect(() => {
    setTokens([
      { name: defaultCurrency, symbol: defaultCurrency, address: ZERO },
      ...tokenItems,
    ])
  }, [network])

  const onSelectToken = (token: Token) => {
    if (typeof onSelect === 'function') {
      onSelect(token)
      setIsOpen(false)
    }
  }

  const tokensFiltered = tokens?.filter(
    (token: Token) =>
      token?.name?.toLowerCase().includes(query?.toLowerCase()) ||
      token?.symbol?.toLowerCase().includes(query?.toLowerCase())
  )

  const getContractTokenSymbol = async () => {
    return await web3Service.getTokenSymbol(contractAddress, network)
  }

  const { isLoading: isLoadingContractToken, data: contractTokenSymbol } =
    useQuery(['getContractTokenSymbol', contractAddress, query], async () =>
      getContractTokenSymbol()
    )

  const addToken = ({
    name,
    symbol,
    address,
    decimals = 18,
  }: Partial<Token>) => {
    const currentList = tokens || []
    setTokens([
      {
        name: name!,
        symbol: symbol!,
        address: address!,
        decimals,
      },
      ...currentList,
    ])
  }

  const onImport = () => {
    addToken({
      name: contractTokenSymbol || addressMinify(contractAddress),
      symbol: contractTokenSymbol || addressMinify(contractAddress),
      address: contractAddress,
    })
    resetField('query')
    setQuery('')
    setContractAddress('')
  }

  const noItems =
    tokensFiltered?.length === 0 &&
    query?.length > 0 &&
    !contractAddress?.length &&
    !isLoadingContractToken

  useEffect(() => {
    if (isOpen) return
    // clear state when modal close
    setQuery('')
    setContractAddress('')
  }, [isOpen])

  return (
    <Transition show={isOpen} appear as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => {
          setIsOpen(false)
        }}
        open
      >
        <div className="fixed inset-0 bg-opacity-25 backdrop-filter backdrop-blur-sm bg-zinc-500" />
        <Transition.Child
          as={Fragment}
          enter="transition ease-out duration-300"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0 translate-y-1"
        >
          <div className="fixed inset-0 p-6 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full">
              <Dialog.Panel className="w-full max-w-md">
                <div className="px-6 text-left rounded-lg bg-ui-secondary-200 py-7">
                  <Input
                    label="Select a token as currency"
                    placeholder="Search or paste contract address"
                    className="bg-transparent"
                    autoComplete="off"
                    {...register('query', {
                      onChange: (e) => setQuery(e.target.value),
                    })}
                  />

                  {contractAddress?.length > 0 && (
                    <div className="flex items-center justify-between mt-3">
                      <span>
                        {contractTokenSymbol || addressMinify(contractAddress)}
                      </span>
                      <Button
                        size="small"
                        onClick={onImport}
                        disabled={isLoadingContractToken}
                        loading={isLoadingContractToken}
                      >
                        Import
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 mt-6 overflow-scroll max-h-48">
                    {noItems && (
                      <span className="text-base">
                        No token matches your filter.
                      </span>
                    )}
                    {tokensFiltered?.map((token: Token, index: number) => {
                      const key = `${token.symbol}-${index}`
                      return (
                        <div key={key}>
                          <span
                            onClick={() => onSelectToken(token)}
                            className="inline-flex items-center gap-3 cursor-pointer"
                          >
                            <CryptoIcon symbol={token.symbol} />
                            <span className="font-bold">
                              {token.symbol.toUpperCase()}
                            </span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
